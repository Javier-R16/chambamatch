import "server-only";
import { sendNotification, WebPushError } from "web-push";

export type Suscripcion = { endpoint: string; p256dh: string; auth: string };
export type CargaPush = { titulo: string; cuerpo: string; url: string; tag: string };

/** Envía la misma notificación a varias suscripciones. Devuelve cuántas se entregaron. */
export async function enviarPush(subs: Suscripcion[], carga: CargaPush) {
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!publica || !privada || !subs.length) return 0;

  const vapidDetails = { subject: process.env.VAPID_SUBJECT ?? "mailto:soporte@chambamatch.app", publicKey: publica, privateKey: privada };
  const resultados = await Promise.allSettled(
    subs.map((s) =>
      sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(carga), {
        vapidDetails,
        TTL: 60 * 60 * 24,
        urgency: "high",
      }),
    ),
  );
  const fallidos = resultados.filter(
    (r) => r.status === "rejected" && !(r.reason instanceof WebPushError && (r.reason.statusCode === 410 || r.reason.statusCode === 404)),
  );
  if (fallidos.length) console.error("Push fallidos:", fallidos.length);
  return resultados.filter((r) => r.status === "fulfilled").length;
}
