import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Cargando } from "@/components/titulo";
import { requerirApp } from "@/lib/sesion";
import { Resultado } from "@/app/entrevista/[id]/resultado";

export const metadata: Metadata = { title: "Resultado de entrevista" };

type Fila = {
  id: string;
  match_id: string;
  estado: string;
  puntaje: number | null;
  resumen: string | null;
  evaluacion: { fortalezas: string[]; mejoras: string[] } | null;
  transcripcion: { rol: "ia" | "candidato"; texto: string }[];
  finalizada_en: string | null;
  jobs: { titulo: string } | null;
  matches: { profiles: { nombre: string } | null } | null;
};

const fecha = new Intl.DateTimeFormat("es-PA", { dateStyle: "medium", timeStyle: "short" });

async function Contenido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requerirApp("empresa");
  // RLS: solo participantes del match pueden leerla
  const { data } = await supabase
    .from("interviews")
    .select("id, match_id, estado, puntaje, resumen, evaluacion, transcripcion, finalizada_en, jobs(titulo), matches(profiles!matches_candidate_id_fkey(nombre))")
    .eq("id", id)
    .eq("modo", "empresa")
    .maybeSingle();
  const e = data as unknown as Fila | null;
  if (!e) notFound();

  const candidato = e.matches?.profiles?.nombre ?? "Candidato";
  return (
    <div className="space-y-6 px-5 pb-10">
      <header className="flex items-center gap-2 pt-3">
        <Link href={`/chat/${e.match_id}`} aria-label="Volver al chat" className="grid size-10 place-items-center rounded-full hover:bg-zinc-200">
          <ChevronLeft className="size-6" />
        </Link>
        <div className="min-w-0">
          <p className="truncate font-bold">{candidato}</p>
          <p className="truncate text-xs text-zinc-500">
            {e.jobs?.titulo} {e.finalizada_en && `· ${fecha.format(new Date(e.finalizada_en))}`}
          </p>
        </div>
      </header>

      {e.puntaje !== null ? (
        <Resultado
          titulo="Entrevista con IA"
          datos={{ puntaje: e.puntaje, resumen: e.resumen ?? "", fortalezas: e.evaluacion?.fortalezas ?? [], mejoras: e.evaluacion?.mejoras ?? [] }}
        />
      ) : (
        <p className="rounded-2xl bg-white p-5 text-zinc-600 ring-1 ring-black/5">Esta entrevista no tiene evaluación (el candidato colgó antes de responder o la IA no estuvo disponible).</p>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold">Transcripción</h2>
        <ol className="space-y-3">
          {e.transcripcion.map((t, i) => (
            <li key={i} className={`rounded-2xl p-3 text-[15px] ${t.rol === "ia" ? "bg-zinc-100 text-zinc-700" : "bg-white ring-1 ring-black/5"}`}>
              <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">{t.rol === "ia" ? "Pregunta" : candidato}</p>
              {t.texto}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-zinc-400">El texto viene del dictado por voz y puede tener errores de transcripción.</p>
      </section>
    </div>
  );
}

export default function ResultadoEntrevista({ params }: PageProps<"/empresa/entrevistas/[id]">) {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido params={params} />
    </Suspense>
  );
}
