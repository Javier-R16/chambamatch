import type { Metadata } from "next";
import { Suspense } from "react";
import { Esqueleto, FeedCandidato } from "@/components/swipe/feed-candidato";
import type { Filtros } from "@/components/swipe/filtros";
import { requerirApp } from "@/lib/sesion";

export const metadata: Metadata = { title: "Chambas" };

async function Feed() {
  const { supabase, uid } = await requerirApp("candidato");
  const { data } = await supabase.from("candidate_profiles").select("habilidades, filtros").eq("user_id", uid).maybeSingle();
  return (
    <FeedCandidato
      uid={uid}
      misHabilidades={data?.habilidades ?? []}
      filtrosIniciales={(data?.filtros as Filtros | null) ?? {}}
    />
  );
}

export default function Chambas() {
  return (
    <div className="h-full">
      <Suspense fallback={<Esqueleto />}>
        <Feed />
      </Suspense>
    </div>
  );
}
