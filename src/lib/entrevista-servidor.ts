import "server-only";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { crearClienteServidor } from "./supabase/server";
import { DESPEDIDA, evaluar, type ContextoVacante, type Turno } from "./entrevista";

export type FilaEntrevista = {
  id: string;
  match_id: string | null;
  candidate_id: string;
  job_id: string | null;
  modo: "empresa" | "practica";
  transcripcion: Turno[];
  estado: "pendiente" | "llamando" | "en_curso" | "completada" | "rechazada" | "fallida";
  titulo_practica: string | null;
  creado_en: string;
  aceptada_en: string | null;
};

export const error = (mensaje: string, estado = 400) => NextResponse.json({ error: mensaje }, { status: estado });

/** Identidad verificada del usuario (JWT validado por Supabase). */
export async function usuarioActual() {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getClaims();
  return { supabase, uid: (data?.claims?.sub as string | undefined) ?? null };
}

export async function leerCuerpo<T>(request: Request): Promise<Partial<T>> {
  return (await request.json().catch(() => ({}))) as Partial<T>;
}

/** Entrevista del candidato autenticado, o null si no es suya. */
export async function entrevistaDeCandidato(admin: SupabaseClient, id: unknown, uid: string) {
  if (typeof id !== "string") return null;
  const { data } = await admin.from("interviews").select("*").eq("id", id).maybeSingle<FilaEntrevista>();
  return data && data.candidate_id === uid ? data : null;
}

export async function contextoDe(admin: SupabaseClient, e: FilaEntrevista): Promise<ContextoVacante & { empresa: string }> {
  if (e.job_id) {
    const { data } = await admin
      .from("jobs")
      .select("titulo, descripcion, habilidades, modalidad, ciudad, companies(nombre)")
      .eq("id", e.job_id)
      .maybeSingle();
    if (data) {
      const empresa = (data.companies as unknown as { nombre: string } | null)?.nombre ?? "la empresa";
      return { ...data, empresa: e.modo === "practica" ? "ChambaMatch" : empresa };
    }
  }
  return { titulo: e.titulo_practica ?? "el puesto", empresa: "ChambaMatch" };
}

export async function tieneConsentimientoIA(supabase: SupabaseClient, uid: string) {
  const { data } = await supabase
    .from("consentimientos")
    .select("id")
    .eq("user_id", uid)
    .eq("tipo", "entrevista_ia")
    .is("revocado_en", null)
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

/** Cierra la entrevista: evalúa con Gemini y guarda puntaje y resumen. */
export async function finalizar(
  admin: SupabaseClient,
  e: FilaEntrevista,
  contexto: ContextoVacante,
) {
  const respuestas = e.transcripcion.filter((t) => t.rol === "candidato").length;
  if (respuestas === 0) {
    await admin.from("interviews").update({ estado: "fallida", transcripcion: e.transcripcion, finalizada_en: new Date().toISOString() }).eq("id", e.id);
    return { fin: true, despedida: DESPEDIDA };
  }
  const ev = await evaluar(contexto, e.transcripcion, e.modo);
  await admin
    .from("interviews")
    .update({
      estado: "completada",
      transcripcion: e.transcripcion,
      puntaje: ev.puntaje,
      resumen: ev.resumen,
      evaluacion: { fortalezas: ev.fortalezas, mejoras: ev.mejoras },
      finalizada_en: new Date().toISOString(),
    })
    .eq("id", e.id);
  // En modo empresa el candidato no ve su puntaje: evitamos señales de rechazo.
  return { fin: true, despedida: DESPEDIDA, resultado: e.modo === "practica" ? ev : undefined };
}
