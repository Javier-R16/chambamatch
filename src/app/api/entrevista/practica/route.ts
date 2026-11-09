import { NextResponse } from "next/server";
import { inicioDiaPanama, VERSION_CONSENTIMIENTO } from "@/lib/constantes";
import { error, leerCuerpo, tieneConsentimientoIA, usuarioActual } from "@/lib/entrevista-servidor";
import { crearClienteAdmin } from "@/lib/supabase/admin";

const PRACTICAS_POR_DIA = 3; // cuida la cuota gratis de Gemini

// El CANDIDATO crea una entrevista de práctica (solo él ve el resultado).
export async function POST(request: Request) {
  const { supabase, uid } = await usuarioActual();
  if (!uid) return error("No autorizado", 401);
  const { jobId, titulo, consiento } = await leerCuerpo<{ jobId: string; titulo: string; consiento: boolean }>(request);

  const { data: perfil } = await supabase.from("profiles").select("rol").eq("id", uid).maybeSingle();
  if (perfil?.rol !== "candidato") return error("Solo para candidatos", 403);

  if (!(await tieneConsentimientoIA(supabase, uid))) {
    if (consiento !== true) return error("Necesitamos tu consentimiento para la entrevista con IA", 428);
    await supabase.from("consentimientos").insert({ user_id: uid, tipo: "entrevista_ia", version: VERSION_CONSENTIMIENTO });
  }

  const admin = crearClienteAdmin();
  const { count } = await admin
    .from("interviews")
    .select("id", { count: "exact", head: true })
    .eq("candidate_id", uid)
    .eq("modo", "practica")
    .gte("creado_en", inicioDiaPanama());
  if ((count ?? 0) >= PRACTICAS_POR_DIA) return error(`Puedes practicar ${PRACTICAS_POR_DIA} veces al día. ¡Vuelve mañana!`, 429);

  // Si eligió una vacante, debe ser una a la que tiene acceso (RLS)
  let job_id: string | null = null;
  if (typeof jobId === "string" && jobId) {
    const { data } = await supabase.from("jobs").select("id").eq("id", jobId).maybeSingle();
    if (!data) return error("Vacante no encontrada", 404);
    job_id = data.id;
  }
  const titulo_practica = typeof titulo === "string" ? titulo.trim().slice(0, 80) : "";
  if (!job_id && !titulo_practica) return error("Elige una vacante o escribe un puesto");

  const ahora = new Date().toISOString();
  const { data, error: e } = await admin
    .from("interviews")
    .insert({ candidate_id: uid, job_id, titulo_practica: titulo_practica || null, modo: "practica", estado: "en_curso", aceptada_en: ahora, iniciada_por: uid })
    .select("id")
    .single();
  if (e) return error("No se pudo crear la práctica", 500);
  return NextResponse.json({ id: data.id });
}
