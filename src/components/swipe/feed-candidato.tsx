"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MazoSwipe } from "./mazo-swipe";
import { TarjetaVacante } from "./tarjetas";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { inicioDiaPanama } from "@/lib/constantes";
import type { Direccion, VacanteFeed } from "@/lib/tipos";

type Props = { uid: string; misHabilidades: string[] };

export function FeedCandidato({ uid, misHabilidades }: Props) {
  const supabase = crearClienteNavegador();
  const [vacantes, setVacantes] = useState<VacanteFeed[]>([]);
  const [cargando, setCargando] = useState(true);
  const [superUsada, setSuperUsada] = useState(true);
  const pidiendo = useRef(false);
  const vistas = useRef(new Set<string>());

  const cargarMas = useCallback(async () => {
    if (pidiendo.current) return;
    pidiendo.current = true;
    const { data, error } = await supabase.rpc("feed_candidato", { p_limite: 20 });
    pidiendo.current = false;
    setCargando(false);
    if (error) return void toast.error("No pudimos cargar vacantes. Revisa tu conexión.");
    const nuevas = (data as VacanteFeed[]).filter((v) => !vistas.current.has(v.id));
    nuevas.forEach((v) => vistas.current.add(v.id));
    setVacantes((prev) => [...prev, ...nuevas]);
  }, [supabase]);

  useEffect(() => {
    cargarMas();
    supabase
      .from("candidate_swipes")
      .select("job_id", { count: "exact", head: true })
      .eq("candidate_id", uid)
      .eq("direccion", "super")
      .gte("creado_en", inicioDiaPanama())
      .then(({ count }) => setSuperUsada((count ?? 0) > 0));
  }, [cargarMas, supabase, uid]);

  const alDeslizar = async (v: VacanteFeed, dir: Direccion) => {
    setVacantes((prev) => {
      const resto = prev.filter((x) => x.id !== v.id);
      if (resto.length < 4) cargarMas();
      return resto;
    });
    if (dir === "super") setSuperUsada(true);

    const { error } = await supabase.from("candidate_swipes").insert({ candidate_id: uid, job_id: v.id, direccion: dir });
    if (error) {
      // Devolvemos la tarjeta para que pueda intentarlo de nuevo
      setVacantes((prev) => [v, ...prev]);
      if (dir === "super") {
        setSuperUsada(true);
        toast.error(error.message.includes("Súper Chamba") ? error.message : "No se pudo enviar. Intenta de nuevo.");
      } else if (error.code === "23505") {
        setVacantes((prev) => prev.filter((x) => x.id !== v.id)); // ya existía: la quitamos
      } else {
        toast.error("No se pudo guardar. Intenta de nuevo.");
      }
      return;
    }
    if (dir === "right") toast.success(`Te postulaste a ${v.titulo}`, { duration: 1500 });
    if (dir === "super") toast.success(`¡Súper Chamba enviada a ${v.empresa_nombre}! Te verán primero.`);
  };

  if (cargando) return <Esqueleto />;

  return (
    <MazoSwipe
      items={vacantes}
      clave={(v) => v.id}
      render={(v) => <TarjetaVacante v={v} misHabilidades={misHabilidades} />}
      onSwipe={alDeslizar}
      permitirSuper
      puedeSuper={!superUsada}
      onSuperBloqueado={() => toast("Ya usaste tu Súper Chamba de hoy. Mañana tienes otra ⭐")}
      etiquetas={{ right: "Me postulo", left: "Paso", super: "Súper" }}
      vacio={
        <div className="space-y-2">
          <p className="text-5xl">🦐</p>
          <p className="text-lg font-semibold">No hay más vacantes por ahora</p>
          <p className="text-sm text-zinc-500">Vuelve más tarde: las empresas publican todos los días.</p>
        </div>
      }
    />
  );
}

export function Esqueleto() {
  return (
    <div className="flex h-full flex-col">
      <div className="relative flex-1">
        <div className="absolute inset-x-3 inset-y-1 animate-pulse rounded-3xl bg-zinc-200" />
      </div>
      <div className="h-24" />
    </div>
  );
}
