// Pide al servidor que envíe la notificación push. "Dispara y olvida":
// si falla, el mensaje igual llegó por tiempo real.
export function notificar(tipo: "mensaje" | "match", id: string) {
  fetch("/api/notificar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tipo, id }),
    keepalive: true,
  }).catch(() => {});
}
