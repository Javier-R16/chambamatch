import { NextResponse } from "next/server";
import { contextoDe, entrevistaDeCandidato, error, finalizar, leerCuerpo, usuarioActual } from "@/lib/entrevista-servidor";
import { crearClienteAdmin } from "@/lib/supabase/admin";

export const maxDuration = 60;

// El candidato cuelga a mitad de la entrevista: se evalúa lo que alcanzó a responder.
export async function POST(request: Request) {
  const { uid } = await usuarioActual();
  if (!uid) return error("No autorizado", 401);
  const { id } = await leerCuerpo<{ id: string }>(request);

  const admin = crearClienteAdmin();
  const e = await entrevistaDeCandidato(admin, id, uid);
  if (!e || e.estado !== "en_curso") return NextResponse.json({ fin: true });

  try {
    return NextResponse.json(await finalizar(admin, e, await contextoDe(admin, e)));
  } catch {
    // Si la IA no responde, cerramos igual sin puntaje
    await admin.from("interviews").update({ estado: "completada", finalizada_en: new Date().toISOString() }).eq("id", e.id);
    return NextResponse.json({ fin: true });
  }
}
