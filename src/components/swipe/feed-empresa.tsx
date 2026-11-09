"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MazoSwipe } from "./mazo-swipe";
import { TarjetaPostulante } from "./tarjetas";
import { Esqueleto } from "./feed-candidato";
import { anunciarMatch } from "@/components/match/capa-match";
import { crearClienteNavegador } from "@/lib/supabase/client";
import type { Direccion, PostulanteFeed } from "@/lib/tipos";

type Props = { jobId: string; tituloVacante: string; habilidadesVacante: string[] };

export function FeedEmpresa({ jobId, tituloVacante, habilidadesVacante }: Props) {
  const supabase = crearClienteNavegador();
  const [postulantes, setPostulantes] = useState<PostulanteFeed[]>([]);
  const [cargando, setCargando] = useState(true);
  const pidiendo = useRef(false);
  const vistos = useRef(new Set<string>());

  const cargarMas = useCallback(async () => {
    if (pidiendo.current) return;
    pidiendo.current = true;
    const { data, error } = await supabase.rpc("feed_empresa", { p_job: jobId, p_limite: 20 });
    pidiendo.current = false;
    setCargando(false);
    if (error) return void toast.error("No pudimos cargar postulantes.");
    const nuevos = (data as PostulanteFeed[]).filter((p) => !vistos.current.has(p.candidate_id));
    nuevos.forEach((p) => vistos.current.add(p.candidate_id));
    setPostulantes((prev) => [...prev, ...nuevos]);
  }, [supabase, jobId]);

  useEffect(() => {
    cargarMas();
  }, [cargarMas]);

  const alDeslizar = async (p: PostulanteFeed, dir: Direccion) => {
    setPostulantes((prev) => {
      const resto = prev.filter((x) => x.candidate_id !== p.candidate_id);
      if (resto.length < 4) cargarMas();
      return resto;
    });

    const { error } = await supabase
      .from("company_swipes")
      .insert({ job_id: jobId, candidate_id: p.candidate_id, direccion: dir });
    if (error && error.code !== "23505") {
      setPostulantes((prev) => [p, ...prev]);
      return void toast.error("No se pudo guardar. Intenta de nuevo.");
    }
    if (dir !== "right") return;

    // El match lo crea un trigger en la BD; aquí solo lo leemos.
    const { data: match } = await supabase
      .from("matches")
      .select("id")
      .eq("job_id", jobId)
      .eq("candidate_id", p.candidate_id)
      .maybeSingle();
    if (match) anunciarMatch({ matchId: match.id, titulo: tituloVacante, con: p.nombre, imagen: p.foto_url });
  };

  if (cargando) return <Esqueleto />;

  return (
    <MazoSwipe
      items={postulantes}
      clave={(p) => p.candidate_id}
      render={(p) => <TarjetaPostulante p={p} habilidadesVacante={habilidadesVacante} />}
      onSwipe={alDeslizar}
      etiquetas={{ right: "Me interesa", left: "Paso" }}
      vacio={
        <div className="space-y-2">
          <p className="text-5xl">📭</p>
          <p className="text-lg font-semibold">Revisaste todos los postulantes</p>
          <p className="text-sm text-zinc-500">Te avisaremos cuando lleguen más.</p>
        </div>
      }
    />
  );
}
