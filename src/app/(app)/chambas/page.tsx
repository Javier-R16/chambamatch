import type { Metadata } from "next";
import { Suspense } from "react";
import { Esqueleto, FeedCandidato } from "@/components/swipe/feed-candidato";
import { requerirApp } from "@/lib/sesion";

export const metadata: Metadata = { title: "Chambas" };

async function Feed() {
  const { supabase, uid } = await requerirApp("candidato");
  const { data } = await supabase.from("candidate_profiles").select("habilidades").eq("user_id", uid).maybeSingle();
  return <FeedCandidato uid={uid} misHabilidades={data?.habilidades ?? []} />;
}

export default function Chambas() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between px-5 pt-4 pb-2">
        <h1 className="text-2xl font-black italic text-rose-600">ChambaMatch</h1>
        <p className="text-xs text-zinc-500">← Paso · Me postulo → · ⭐ Súper ↑</p>
      </header>
      <div className="min-h-0 flex-1">
        <Suspense fallback={<Esqueleto />}>
          <Feed />
        </Suspense>
      </div>
    </div>
  );
}
