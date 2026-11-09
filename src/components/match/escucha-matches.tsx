"use client";

import { useEffect } from "react";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { anunciarMatch } from "./capa-match";

/**
 * El candidato no sabe cuándo la empresa lo desliza; el match le llega en vivo
 * por Supabase Realtime (que respeta RLS).
 */
export function EscuchaMatches({ uid }: { uid: string }) {
  useEffect(() => {
    const supabase = crearClienteNavegador();
    const canal = supabase
      .channel(`matches-${uid}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "matches", filter: `candidate_id=eq.${uid}` },
        async (payload) => {
          const { data } = await supabase
            .from("matches")
            .select("id, jobs(titulo), companies(nombre, logo_url)")
            .eq("id", (payload.new as { id: string }).id)
            .single();
          if (!data) return;
          const job = data.jobs as unknown as { titulo: string } | null;
          const empresa = data.companies as unknown as { nombre: string; logo_url: string | null } | null;
          anunciarMatch({
            matchId: data.id,
            titulo: job?.titulo ?? "",
            con: empresa?.nombre ?? "la empresa",
            imagen: empresa?.logo_url,
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [uid]);

  return null;
}
