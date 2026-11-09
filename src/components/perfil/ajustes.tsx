"use client";

import { Bell, BellOff, Download, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { crearClienteNavegador } from "@/lib/supabase/client";

function claveABytes(base64: string) {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const crudo = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(crudo, (c) => c.charCodeAt(0));
}

/** Activa o desactiva las notificaciones push en este dispositivo. */
export function Notificaciones({ uid }: { uid: string }) {
  const supabase = crearClienteNavegador();
  const [estado, setEstado] = useState<"cargando" | "no-soportado" | "denegado" | "activo" | "inactivo">("cargando");
  const clave = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    const detectar = async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !clave) return "no-soportado" as const;
      if (Notification.permission === "denied") return "denegado" as const;
      const reg = await navigator.serviceWorker.ready;
      return (await reg.pushManager.getSubscription()) ? ("activo" as const) : ("inactivo" as const);
    };
    detectar().then(setEstado);
  }, [clave]);

  async function activar() {
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") return void setEstado("denegado");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveABytes(clave!) });
      const json = sub.toJSON();
      const { error } = await supabase
        .from("push_subscriptions")
        .insert({ user_id: uid, endpoint: sub.endpoint, p256dh: json.keys!.p256dh, auth: json.keys!.auth });
      if (error && error.code !== "23505") throw error;
      setEstado("activo");
      toast.success("Te avisaremos de matches y mensajes nuevos.");
    } catch {
      toast.error("No se pudieron activar las notificaciones en este navegador.");
    }
  }

  async function desactivar() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
    setEstado("inactivo");
  }

  if (estado === "cargando") return null;
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
      {estado === "activo" ? <Bell className="size-5 text-rose-600" /> : <BellOff className="size-5 text-zinc-400" />}
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Notificaciones</p>
        <p className="text-sm text-zinc-500">
          {estado === "activo" && "Activadas en este dispositivo."}
          {estado === "inactivo" && "Entérate al instante de matches y mensajes."}
          {estado === "denegado" && "Bloqueadas. Actívalas en los ajustes del navegador."}
          {estado === "no-soportado" && "No disponibles en este navegador. Instala la app desde Chrome."}
        </p>
      </div>
      {estado === "inactivo" && (
        <Button size="sm" className="h-9 px-3 font-semibold" onClick={activar}>
          Activar
        </Button>
      )}
      {estado === "activo" && (
        <Button size="sm" variant="outline" className="h-9 px-3" onClick={desactivar}>
          Desactivar
        </Button>
      )}
    </div>
  );
}

type EventoInstalacion = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Botón "Instalar app" (Chrome Android / escritorio). Se oculta si ya está instalada. */
export function InstalarApp() {
  const [evento, setEvento] = useState<EventoInstalacion | null>(null);

  useEffect(() => {
    const alPedir = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalacion);
    };
    window.addEventListener("beforeinstallprompt", alPedir);
    return () => window.removeEventListener("beforeinstallprompt", alPedir);
  }, []);

  if (!evento) return null;
  return (
    <Button
      variant="outline"
      className="w-full gap-2 bg-white"
      onClick={async () => {
        await evento.prompt();
        await evento.userChoice;
        setEvento(null);
      }}
    >
      <Download className="size-4" /> Instalar ChambaMatch en este teléfono
    </Button>
  );
}

/** Derecho de cancelación (Ley 81): borra archivos y cuenta. */
export function BorrarCuenta({ uid }: { uid: string }) {
  const supabase = crearClienteNavegador();
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [confirmacion, setConfirmacion] = useState("");
  const [borrando, setBorrando] = useState(false);

  async function borrar() {
    setBorrando(true);
    try {
      for (const bucket of ["avatars", "logos", "cvs"]) {
        const { data } = await supabase.storage.from(bucket).list(uid, { limit: 1000 });
        if (data?.length) await supabase.storage.from(bucket).remove(data.map((f) => `${uid}/${f.name}`));
      }
      const { error } = await supabase.rpc("borrar_mi_cuenta");
      if (error) throw error;
      await supabase.auth.signOut();
      toast.success("Tu cuenta y tus datos fueron eliminados.");
      router.replace("/");
      router.refresh();
    } catch {
      toast.error("No se pudo borrar la cuenta. Intenta de nuevo.");
      setBorrando(false);
    }
  }

  if (!abierto) {
    return (
      <Button variant="ghost" className="w-full gap-2 text-rose-600" onClick={() => setAbierto(true)}>
        <Trash2 className="size-4" /> Borrar mi cuenta y mis datos
      </Button>
    );
  }
  return (
    <div className="space-y-3 rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-200">
      <p className="font-semibold text-rose-800">Esto no se puede deshacer</p>
      <p className="text-sm text-rose-800/80">
        Se borran tu perfil, fotos, CV, postulaciones, vacantes, matches y mensajes. Escribe <b>BORRAR</b> para confirmar.
      </p>
      <Input value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} className="bg-white" aria-label="Escribe BORRAR" />
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 bg-white" onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
        <Button variant="destructive" className="flex-1 font-bold" disabled={confirmacion !== "BORRAR" || borrando} onClick={borrar}>
          {borrando ? "Borrando…" : "Borrar"}
        </Button>
      </div>
    </div>
  );
}
