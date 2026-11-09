import { NextResponse } from "next/server";
import { error, leerCuerpo, usuarioActual } from "@/lib/entrevista-servidor";
import { enviarPush, type Suscripcion } from "@/lib/push";
import { crearClienteAdmin } from "@/lib/supabase/admin";

// La EMPRESA activa la entrevista con IA para uno de sus matches: el candidato recibe la "llamada".
export async function POST(request: Request) {
  const { supabase, uid } = await usuarioActual();
  if (!uid) return error("No autorizado", 401);
  const { matchId } = await leerCuerpo<{ matchId: string }>(request);
  if (typeof matchId !== "string") return error("Falta el match");

  const admin = crearClienteAdmin();
  const { data: match } = await admin
    .from("matches")
    .select("id, candidate_id, job_id, companies(nombre, owner_id), jobs(titulo)")
    .eq("id", matchId)
    .maybeSingle();
  const empresa = match?.companies as unknown as { nombre: string; owner_id: string } | null;
  if (!match || empresa?.owner_id !== uid) return error("No autorizado", 403);

  const { data: bloqueado } = await supabase.rpc("match_bloqueado", { p_match: matchId });
  if (bloqueado) return error("No es posible llamar a este candidato", 403);

  // Libera llamadas viejas sin contestar (48 h) o entrevistas abandonadas (2 h)
  const ahora = Date.now();
  await admin
    .from("interviews")
    .update({ estado: "fallida", finalizada_en: new Date().toISOString() })
    .eq("match_id", matchId)
    .or(
      `and(estado.eq.llamando,creado_en.lt.${new Date(ahora - 48 * 3600_000).toISOString()}),` +
        `and(estado.eq.en_curso,aceptada_en.lt.${new Date(ahora - 2 * 3600_000).toISOString()})`,
    );

  const { data: nueva, error: e } = await admin
    .from("interviews")
    .insert({ match_id: matchId, candidate_id: match.candidate_id, job_id: match.job_id, modo: "empresa", estado: "llamando", iniciada_por: uid })
    .select("id")
    .single();
  if (e) {
    if (e.code === "23505") return error("Ya hay una entrevista en curso para este match", 409);
    console.error(e);
    return error("No se pudo iniciar la entrevista", 500);
  }

  const { data: subs } = await admin.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", match.candidate_id);
  await enviarPush((subs ?? []) as Suscripcion[], {
    titulo: `📞 ${empresa.nombre} te está llamando`,
    cuerpo: `Entrevista para «${(match.jobs as unknown as { titulo: string } | null)?.titulo ?? "la vacante"}». Toca para contestar.`,
    url: "/chambas",
    tag: `llamada-${nueva.id}`,
  });

  return NextResponse.json({ id: nueva.id });
}
