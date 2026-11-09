import { NextResponse, type NextRequest } from "next/server";
import { enviarPush, type Suscripcion } from "@/lib/push";
import { crearClienteServidor } from "@/lib/supabase/server";

/**
 * Envía notificaciones push de un mensaje o match recién creado.
 * Usa la sesión del usuario: las funciones de la BD verifican que sea el remitente
 * (o la empresa del match) y que no se haya notificado antes. No usa service role.
 */
export async function POST(request: NextRequest) {
  const { tipo, id } = (await request.json().catch(() => ({}))) as { tipo?: string; id?: string };
  if ((tipo !== "mensaje" && tipo !== "match") || typeof id !== "string") {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  }

  const supabase = await crearClienteServidor();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (tipo === "mensaje") {
    const { data } = await supabase.rpc("preparar_push_mensaje", { p_message: id });
    const filas = (data ?? []) as (Suscripcion & { remitente: string; match_id: string; vista_previa: string })[];
    if (!filas.length) return NextResponse.json({ enviado: 0 });
    const f = filas[0];
    const enviado = await enviarPush(filas, { titulo: f.remitente, cuerpo: f.vista_previa, url: `/chat/${f.match_id}`, tag: `chat-${f.match_id}` });
    return NextResponse.json({ enviado });
  }

  const { data } = await supabase.rpc("preparar_push_match", { p_match: id });
  const filas = (data ?? []) as (Suscripcion & { empresa: string; titulo: string })[];
  if (!filas.length) return NextResponse.json({ enviado: 0 });
  const enviado = await enviarPush(filas, {
    titulo: "¡Hay chamba! 🎉",
    cuerpo: `${filas[0].empresa} quiere hablar contigo sobre «${filas[0].titulo}»`,
    url: `/chat/${id}`,
    tag: `match-${id}`,
  });
  return NextResponse.json({ enviado });
}
