"use client";

import { useEffect } from "react";

// Registra el service worker (push + instalación como app).
export function RegistrarSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }
  }, []);
  return null;
}
