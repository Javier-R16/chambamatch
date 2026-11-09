"use client";

import { Bot, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { crearClienteNavegador } from "@/lib/supabase/client";

type Estado = { id: string; estado: string; puntaje: number | null } | null;

/** Para la EMPRESA en el chat: activar la entrevista con IA y ver su estado o resultado. */
export function BotonEntrevista({ matchId }: { matchId: string }) {
  const [ultima, setUltima] = useState<Estado>(null);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await crearClienteNavegador()
      .from("interviews")
      .select("id, estado, puntaje")
      .eq("match_id", matchId)
      .eq("modo", "empresa")
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle();
    setUltima(data);
  }, [matchId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial asíncrona
    cargar();
    const supabase = crearClienteNavegador();
    const canal = supabase
      .channel(`entrevista-${matchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "interviews", filter: `match_id=eq.${matchId}` }, () => cargar())
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [cargar, matchId]);

  async function iniciar() {
    setEnviando(true);
    const r = await fetch("/api/entrevista/iniciar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId }),
    });
    setEnviando(false);
    const datos = await r.json().catch(() => ({}));
    if (!r.ok) return void toast.error(datos.error ?? "No se pudo iniciar");
    toast.success("Llamando al candidato… Le aparecerá la llamada al abrir la app.");
    cargar();
  }

  const clase = "inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 font-medium";

  if (ultima?.estado === "llamando") return <span className={`${clase} bg-amber-100 text-amber-800`}>📞 Llamando…</span>;
  if (ultima?.estado === "en_curso")
    return (
      <span className={`${clase} bg-sky-100 text-sky-800`}>
        <Loader2 className="size-3.5 animate-spin" /> Entrevista en curso
      </span>
    );
  if (ultima?.estado === "completada")
    return (
      <Link href={`/empresa/entrevistas/${ultima.id}`} className={`${clase} bg-emerald-100 text-emerald-800`}>
        <Bot className="size-3.5" /> Resultado IA{ultima.puntaje !== null ? `: ${ultima.puntaje}/100` : ""}
      </Link>
    );

  return (
    <button type="button" onClick={iniciar} disabled={enviando} className={`${clase} bg-zinc-900 text-white disabled:opacity-50`}>
      <Bot className="size-3.5" />
      {ultima?.estado === "rechazada" || ultima?.estado === "fallida" ? "Volver a llamar (IA)" : "Entrevista con IA"}
    </button>
  );
}
