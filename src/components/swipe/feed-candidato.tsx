"use client";

import { Star } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BotonFiltros, cantidadFiltros, type Filtros } from "./filtros";
import { MazoSwipe } from "./mazo-swipe";
import { TarjetaVacante } from "./tarjetas";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { inicioDiaPanama } from "@/lib/constantes";
import type { Direccion, VacanteFeed } from "@/lib/tipos";

type Props = { uid: string; misHabilidades: string[]; filtrosIniciales: Filtros };

export function FeedCandidato({ uid, misHabilidades, filtrosIniciales }: Props) {
  const supabase = crearClienteNavegador();
  const [filtros, setFiltros] = useState<Filtros>(filtrosIniciales);
  const [vacantes, setVacantes] = useState<VacanteFeed[]>([]);
  const [cargando, setCargando] = useState(true);
  const [superUsada, setSuperUsada] = useState(true);
  const pidiendo = useRef(false);
  const vistas = useRef(new Set<string>());

  const cargarMas = useCallback(async () => {
    if (pidiendo.current) return;
    pidiendo.current = true;
    const { data, error } = await supabase.rpc("feed_candidato", {
      p_provincias: filtros.provincias?.length ? filtros.provincias : null,
      p_modalidades: filtros.modalidades?.length ? filtros.modalidades : null,
      p_salario_min: filtros.salario_min || null,
      p_limite: 20,
    });
    pidiendo.current = false;
    setCargando(false);
    if (error) return void toast.error("No pudimos cargar vacantes. Revisa tu conexión.");
    const nuevas = (data as VacanteFeed[]).filter((v) => !vistas.current.has(v.id));
    nuevas.forEach((v) => vistas.current.add(v.id));
    setVacantes((prev) => [...prev, ...nuevas]);
  }, [supabase, filtros]);

  useEffect(() => {
    cargarMas();
  }, [cargarMas]);

  useEffect(() => {
    supabase
      .from("candidate_swipes")
      .select("job_id", { count: "exact", head: true })
      .eq("candidate_id", uid)
      .eq("direccion", "super")
      .gte("creado_en", inicioDiaPanama())
      .then(({ count }) => setSuperUsada((count ?? 0) > 0));
  }, [supabase, uid]);

  async function aplicarFiltros(f: Filtros) {
    vistas.current = new Set();
    setVacantes([]);
    setCargando(true);
    setFiltros(f); // dispara cargarMas con los nuevos filtros
    const { error } = await supabase.from("candidate_profiles").update({ filtros: f }).eq("user_id", uid);
    if (error) toast.error("No se pudieron guardar los filtros.");
  }

  const alDeslizar = async (v: VacanteFeed, dir: Direccion) => {
    setVacantes((prev) => {
      const resto = prev.filter((x) => x.id !== v.id);
      if (resto.length < 4) cargarMas();
      return resto;
    });
    if (dir === "super") setSuperUsada(true);

    const { error } = await supabase.from("candidate_swipes").insert({ candidate_id: uid, job_id: v.id, direccion: dir });
    if (error) {
      if (error.code === "23505") return; // ya existía
      setVacantes((prev) => [v, ...prev]); // la devolvemos para reintentar
      toast.error(
        dir === "super" && error.message.includes("Súper Chamba") ? error.message : "No se pudo guardar. Intenta de nuevo.",
      );
      return;
    }
    if (dir === "right") toast.success(`Te postulaste a ${v.titulo}`, { duration: 1500 });
    if (dir === "super") toast.success(`¡Súper Chamba enviada a ${v.empresa_nombre}! Te verán primero.`);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-2 px-5 pt-4 pb-2">
        <h1 className="text-2xl font-black italic text-rose-600">ChambaMatch</h1>
        <div className="flex items-center gap-2">
          <span
            title="Súper Chamba: 1 gratis al día. Desliza hacia arriba o toca ★."
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
              superUsada ? "bg-zinc-100 text-zinc-400" : "bg-sky-100 text-sky-700"
            }`}
          >
            <Star className="size-3.5" fill="currentColor" />
            {superUsada ? "Mañana" : "1 hoy"}
          </span>
          <BotonFiltros filtros={filtros} onAplicar={aplicarFiltros} />
        </div>
      </header>
      <div className="min-h-0 flex-1">
        {cargando ? (
          <Esqueleto />
        ) : (
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
                <p className="text-sm text-zinc-500">
                  {cantidadFiltros(filtros)
                    ? "Prueba a quitar algunos filtros para ver más."
                    : "Vuelve más tarde: las empresas publican todos los días."}
                </p>
              </div>
            }
          />
        )}
      </div>
    </div>
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
