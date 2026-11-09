import { NextResponse } from "next/server";
import { VERSION_CONSENTIMIENTO } from "@/lib/constantes";
import { entrevistaDeCandidato, error, leerCuerpo, tieneConsentimientoIA, usuarioActual } from "@/lib/entrevista-servidor";
import { crearClienteAdmin } from "@/lib/supabase/admin";

// El CANDIDATO contesta o cuelga la llamada entrante.
export async function POST(request: Request) {
  const { supabase, uid } = await usuarioActual();
  if (!uid) return error("No autorizado", 401);
  const { id, acepta, consiento } = await leerCuerpo<{ id: string; acepta: boolean; consiento: boolean }>(request);

  const admin = crearClienteAdmin();
  const e = await entrevistaDeCandidato(admin, id, uid);
  if (!e || e.estado !== "llamando") return error("Esta llamada ya no está disponible", 404);

  if (!acepta) {
    await admin.from("interviews").update({ estado: "rechazada", finalizada_en: new Date().toISOString() }).eq("id", e.id);
    return NextResponse.json({ ok: true });
  }

  // Ley 81: consentimiento explícito para la entrevista con IA
  if (!(await tieneConsentimientoIA(supabase, uid))) {
    if (consiento !== true) return error("Necesitamos tu consentimiento para la entrevista con IA", 428);
    const { error: ec } = await supabase
      .from("consentimientos")
      .insert({ user_id: uid, tipo: "entrevista_ia", version: VERSION_CONSENTIMIENTO });
    if (ec) return error("No se pudo registrar el consentimiento", 500);
  }

  await admin.from("interviews").update({ estado: "en_curso", aceptada_en: new Date().toISOString() }).eq("id", e.id).eq("estado", "llamando");
  return NextResponse.json({ ok: true, id: e.id });
}
