import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requerirApp } from "@/lib/sesion";
import { Llamada } from "./llamada";
import { Resultado, type DatosResultado } from "./resultado";

export const metadata: Metadata = { title: "Entrevista" };

type Fila = {
  id: string;
  candidate_id: string;
  modo: "empresa" | "practica";
  estado: string;
  puntaje: number | null;
  resumen: string | null;
  evaluacion: { fortalezas: string[]; mejoras: string[] } | null;
  titulo_practica: string | null;
  jobs: { titulo: string; companies: { nombre: string; logo_url: string | null } | null } | null;
};

async function Contenido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, uid } = await requerirApp("candidato");
  const { data } = await supabase
    .from("interviews")
    .select("id, candidate_id, modo, estado, puntaje, resumen, evaluacion, titulo_practica, jobs(titulo, companies(nombre, logo_url))")
    .eq("id", id)
    .maybeSingle();
  const e = data as unknown as Fila | null;
  if (!e || e.candidate_id !== uid) notFound();

  const puesto = e.jobs?.titulo ?? e.titulo_practica ?? "Puesto";
  const empresa = e.modo === "practica" ? "Chamba · Práctica" : (e.jobs?.companies?.nombre ?? "Empresa");

  if (e.estado === "en_curso") {
    return <Llamada id={e.id} empresa={empresa} logo={e.modo === "empresa" ? (e.jobs?.companies?.logo_url ?? null) : null} puesto={puesto} modo={e.modo} />;
  }

  // Ya terminó: la práctica muestra su resultado; la de empresa, solo un agradecimiento.
  const resultado: DatosResultado | null =
    e.modo === "practica" && e.estado === "completada" && e.puntaje !== null
      ? { puntaje: e.puntaje, resumen: e.resumen ?? "", fortalezas: e.evaluacion?.fortalezas ?? [], mejoras: e.evaluacion?.mejoras ?? [] }
      : null;

  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 py-8">
      {resultado ? (
        <Resultado datos={resultado} titulo={`Práctica: ${puesto}`} />
      ) : (
        <div className="py-16 text-center">
          <p className="text-5xl">📞</p>
          <h1 className="mt-4 text-2xl font-black">Esta entrevista ya terminó</h1>
          <p className="mt-2 text-zinc-600">{e.modo === "empresa" ? `${empresa} ya tiene tus respuestas.` : "No hubo respuestas para evaluar."}</p>
        </div>
      )}
      <Link href={e.modo === "empresa" ? "/matches" : "/practica"} className="mt-8 block rounded-full bg-rose-600 py-3 text-center font-bold text-white">
        Volver
      </Link>
    </main>
  );
}

export default function PaginaEntrevista({ params }: PageProps<"/entrevista/[id]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-zinc-900" />}>
      <Contenido params={params} />
    </Suspense>
  );
}
