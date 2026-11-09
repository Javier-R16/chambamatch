import { NextResponse, type NextRequest } from "next/server";
import { sendNotification, WebPushError } from "web-push";
import { crearClienteServidor } from "@/lib/supabase/server";

type Suscripcion = { endpoint: string; p256dh: string; auth: string };
type Carga = { titulo: string; cuerpo: string; url: string; tag: string };

/**
 * Envía notificaciones push de un mensaje o match recién creado.
 * Usa la sesión del usuario: las funciones de la BD verifican que sea el remitente
 * (o la empresa del match) y que no se haya notificado antes. No usa service role.
 */
export async function POST(request: NextRequest) {
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!publica || !privada) return NextResponse.json({ enviado: 0, motivo: "push no configurado" });

  const { tipo, id } = (await request.json().catch(() => ({}))) as { tipo?: string; id?: string };
  if ((tipo !== "mensaje" && tipo !== "match") || typeof id !== "string") {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  }

  const supabase = await crearClienteServidor();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let destinos: (Suscripcion & { carga: Carga })[] = [];
  if (tipo === "mensaje") {
    const { data } = await supabase.rpc("preparar_push_mensaje", { p_message: id });
    destinos = ((data ?? []) as (Suscripcion & { remitente: string; match_id: string; vista_previa: string })[]).map((s) => ({
      ...s,
      carga: { titulo: s.remitente, cuerpo: s.vista_previa, url: `/chat/${s.match_id}`, tag: `chat-${s.match_id}` },
    }));
  } else {
    const { data } = await supabase.rpc("preparar_push_match", { p_match: id });
    destinos = ((data ?? []) as (Suscripcion & { empresa: string; titulo: string })[]).map((s) => ({
      ...s,
      carga: { titulo: "¡Hay chamba! 🎉", cuerpo: `${s.empresa} quiere hablar contigo sobre «${s.titulo}»`, url: `/chat/${id}`, tag: `match-${id}` },
    }));
  }

  const vapidDetails = { subject: process.env.VAPID_SUBJECT ?? "mailto:soporte@chambamatch.app", publicKey: publica, privateKey: privada };
  const resultados = await Promise.allSettled(
    destinos.map((d) =>
      sendNotification({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } }, JSON.stringify(d.carga), {
        vapidDetails,
        TTL: 60 * 60 * 24,
        urgency: "high",
      }),
    ),
  );
  const fallidos = resultados.filter((r) => r.status === "rejected" && !(r.reason instanceof WebPushError && r.reason.statusCode === 410));
  if (fallidos.length) console.error("Push fallidos:", fallidos.length);

  return NextResponse.json({ enviado: resultados.length - fallidos.length });
}
