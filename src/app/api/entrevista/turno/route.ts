import { NextResponse } from "next/server";
import { generarPreguntas, SALUDO, TOTAL_PREGUNTAS, type Turno } from "@/lib/entrevista";
import { contextoDe, entrevistaDeCandidato, error, finalizar, leerCuerpo, usuarioActual } from "@/lib/entrevista-servidor";
import { ErrorGemini } from "@/lib/gemini";
import { crearClienteAdmin } from "@/lib/supabase/admin";

export const maxDuration = 60;

/**
 * Avanza la entrevista: guarda la respuesta (si viene) y devuelve la siguiente pregunta.
 * Al responder la última, evalúa con Gemini y cierra. Todo se guarda en el servidor:
 * el cliente nunca escribe la transcripción ni el puntaje.
 */
export async function POST(request: Request) {
  const { uid } = await usuarioActual();
  if (!uid) return error("No autorizado", 401);
  const { id, respuesta } = await leerCuerpo<{ id: string; respuesta: string }>(request);

  const admin = crearClienteAdmin();
  const e = await entrevistaDeCandidato(admin, id, uid);
  if (!e) return error("Entrevista no encontrada", 404);
  if (e.estado !== "en_curso") return error("Esta entrevista ya terminó", 409);

  const contexto = await contextoDe(admin, e);
  const transcripcion: Turno[] = Array.isArray(e.transcripcion) ? e.transcripcion : [];

  try {
    // 1) Preguntas (una sola llamada a Gemini por entrevista)
    let { data: fila } = await admin.from("interview_preguntas").select("preguntas").eq("interview_id", e.id).maybeSingle();
    if (!fila) {
      const preguntas = await generarPreguntas(contexto);
      await admin.from("interview_preguntas").upsert({ interview_id: e.id, preguntas });
      fila = { preguntas };
    }
    const preguntas = fila.preguntas as string[];

    // 2) Guardar respuesta (solo si la última intervención fue de la IA)
    const texto = typeof respuesta === "string" ? respuesta.trim().slice(0, 2000) : "";
    const ultimo = transcripcion.at(-1);
    if (texto && ultimo?.rol === "ia") transcripcion.push({ rol: "candidato", texto, t: new Date().toISOString() });

    const hechas = transcripcion.filter((t) => t.rol === "ia").length;
    const esperaRespuesta = transcripcion.at(-1)?.rol === "ia";

    // Reanudar: si recarga la página sin responder, repetimos la misma pregunta
    if (esperaRespuesta) {
      return NextResponse.json({ pregunta: transcripcion.at(-1)!.texto, numero: hechas, total: TOTAL_PREGUNTAS });
    }

    // 3) Siguiente pregunta
    if (hechas < Math.min(TOTAL_PREGUNTAS, preguntas.length)) {
      const pregunta = preguntas[hechas];
      transcripcion.push({ rol: "ia", texto: pregunta, t: new Date().toISOString() });
      await admin.from("interviews").update({ transcripcion }).eq("id", e.id);
      return NextResponse.json({
        saludo: hechas === 0 ? SALUDO(contexto.empresa, contexto.titulo) : undefined,
        pregunta,
        numero: hechas + 1,
        total: TOTAL_PREGUNTAS,
      });
    }

    // 4) Fin: evaluación
    return NextResponse.json(await finalizar(admin, { ...e, transcripcion }, contexto));
  } catch (err) {
    await admin.from("interviews").update({ transcripcion }).eq("id", e.id);
    if (err instanceof ErrorGemini) return error(err.message, err.estado === 429 ? 429 : 503);
    console.error(err);
    return error("Algo falló en la entrevista. Intenta de nuevo.", 500);
  }
}
