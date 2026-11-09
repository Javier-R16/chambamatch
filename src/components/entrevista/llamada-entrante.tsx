"use client";

import { AnimatePresence, motion } from "motion/react";
import { Phone, PhoneOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/avatar";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { TextoConsentimientoIA } from "./consentimiento-ia";

type Llamada = { id: string; empresa: string; logo: string | null; puesto: string };

/**
 * "[Empresa] te está llamando para la entrevista". Aparece al instante (Realtime)
 * o al abrir la app si hay una llamada pendiente de las últimas 48 horas.
 */
export function LlamadaEntrante({ uid }: { uid: string }) {
  const router = useRouter();
  const [llamada, setLlamada] = useState<Llamada | null>(null);
  const [necesitaConsentimiento, setNecesitaConsentimiento] = useState(false);
  const [consiento, setConsiento] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(
    async (id?: string) => {
      const supabase = crearClienteNavegador();
      let q = supabase
        .from("interviews")
        .select("id, jobs(titulo, companies(nombre, logo_url))")
        .eq("candidate_id", uid)
        .eq("modo", "empresa")
        .eq("estado", "llamando")
        .gte("creado_en", new Date(Date.now() - 48 * 3600_000).toISOString())
        .order("creado_en", { ascending: false })
        .limit(1);
      if (id) q = q.eq("id", id);
      const { data } = await q.maybeSingle();
      if (!data) return;
      const job = data.jobs as unknown as { titulo: string; companies: { nombre: string; logo_url: string | null } | null } | null;
      const { data: c } = await supabase
        .from("consentimientos")
        .select("id")
        .eq("user_id", uid)
        .eq("tipo", "entrevista_ia")
        .is("revocado_en", null)
        .limit(1)
        .maybeSingle();
      setNecesitaConsentimiento(!c);
      setLlamada({ id: data.id, empresa: job?.companies?.nombre ?? "Una empresa", logo: job?.companies?.logo_url ?? null, puesto: job?.titulo ?? "" });
    },
    [uid],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial asíncrona
    cargar();
    const supabase = crearClienteNavegador();
    const canal = supabase
      .channel(`llamadas-${uid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "interviews", filter: `candidate_id=eq.${uid}` }, (p) => {
        const n = p.new as { id: string; modo: string; estado: string };
        if (n.modo === "empresa" && n.estado === "llamando") cargar(n.id);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [cargar, uid]);

  // Vibración tipo timbre mientras suena
  useEffect(() => {
    if (!llamada) return;
    const timbre = () => navigator.vibrate?.([400, 200, 400]);
    timbre();
    const t = setInterval(timbre, 2500);
    return () => {
      clearInterval(t);
      navigator.vibrate?.(0);
    };
  }, [llamada]);

  async function responder(acepta: boolean) {
    if (!llamada) return;
    if (acepta && necesitaConsentimiento && !consiento) return void toast("Marca la casilla de consentimiento para contestar.");
    setEnviando(true);
    const r = await fetch("/api/entrevista/responder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: llamada.id, acepta, consiento }),
    });
    setEnviando(false);
    const datos = await r.json().catch(() => ({}));
    if (!r.ok) {
      toast.error(datos.error ?? "No se pudo responder");
      if (r.status === 404) setLlamada(null);
      return;
    }
    const id = llamada.id;
    setLlamada(null);
    if (acepta) router.push(`/entrevista/${id}`);
  }

  return (
    <AnimatePresence>
      {llamada && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`${llamada.empresa} te está llamando`}
          className="fixed inset-0 z-50 flex flex-col items-center bg-gradient-to-b from-zinc-900 to-rose-950 px-6 pt-[max(4rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] text-center text-white"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
        >
          <div className="relative">
            <span className="absolute inset-0 animate-ping rounded-3xl bg-emerald-400/30 motion-reduce:animate-none" />
            <Avatar src={llamada.logo} nombre={llamada.empresa} cuadrado className="relative size-28 text-4xl" />
          </div>
          <p className="mt-6 text-2xl font-bold">{llamada.empresa}</p>
          <p className="mt-1 text-lg text-white/80">te está llamando para la entrevista</p>
          {llamada.puesto && <p className="mt-1 text-sm text-white/60">«{llamada.puesto}» · entrevista con IA, ~5 min</p>}

          {necesitaConsentimiento && (
            <label className="mt-8 flex max-w-sm items-start gap-3 rounded-2xl bg-white/10 p-4 text-left text-sm">
              <input type="checkbox" checked={consiento} onChange={(e) => setConsiento(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-emerald-500" />
              <TextoConsentimientoIA />
            </label>
          )}

          <div className="mt-auto flex w-full max-w-xs justify-between">
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                aria-label="Colgar"
                disabled={enviando}
                onClick={() => responder(false)}
                className="grid size-18 place-items-center rounded-full bg-rose-600 shadow-lg transition-transform duration-150 active:scale-90"
              >
                <PhoneOff className="size-8" />
              </button>
              <span className="text-sm text-white/80">Colgar</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                aria-label="Contestar"
                disabled={enviando}
                onClick={() => responder(true)}
                className="grid size-18 place-items-center rounded-full bg-emerald-500 shadow-lg transition-transform duration-150 active:scale-90 motion-safe:animate-bounce"
              >
                <Phone className="size-8" />
              </button>
              <span className="text-sm text-white/80">Contestar</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
