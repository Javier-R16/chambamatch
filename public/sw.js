// Service worker de ChambaMatch: notificaciones push y requisito de PWA instalable.
// No cachea páginas: la app necesita datos en vivo.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let datos = { titulo: "ChambaMatch", cuerpo: "Tienes novedades", url: "/matches", tag: "general" };
  try {
    datos = { ...datos, ...event.data.json() };
  } catch {}

  event.waitUntil(
    (async () => {
      // Si ya está abierta y visible la misma pantalla, no molestamos.
      const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const yaVisible = ventanas.some(
        (c) => c.visibilityState === "visible" && new URL(c.url).pathname === datos.url,
      );
      if (yaVisible) return;
      await self.registration.showNotification(datos.titulo, {
        body: datos.cuerpo,
        icon: "/icons/192",
        badge: "/icons/96",
        tag: datos.tag,
        renotify: true,
        data: { url: datos.url },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/matches";
  event.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of ventanas) {
        if ("focus" in c) {
          await c.focus();
          if ("navigate" in c) await c.navigate(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
