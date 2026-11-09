import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Esqueleto } from "@/components/swipe/feed-candidato";
import { FeedEmpresa } from "@/components/swipe/feed-empresa";
import { requerirApp } from "@/lib/sesion";

export const metadata: Metadata = { title: "Postulantes" };

async function Contenido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requerirApp("empresa");
  const [{ data: vacante }, { data: miEmpresa }] = await Promise.all([
    supabase.from("jobs").select("id, titulo, habilidades, company_id").eq("id", id).maybeSingle(),
    supabase.rpc("mi_company_id"),
  ]);
  if (!vacante || vacante.company_id !== miEmpresa) notFound();

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 px-3 pt-3 pb-2">
        <Link href="/empresa" aria-label="Volver" className="grid size-10 place-items-center rounded-full hover:bg-zinc-200">
          <ChevronLeft className="size-6" />
        </Link>
        <div className="min-w-0">
          <p className="text-xs text-zinc-500">Postulantes para</p>
          <h1 className="truncate text-lg font-bold">{vacante.titulo}</h1>
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <FeedEmpresa jobId={vacante.id} tituloVacante={vacante.titulo} habilidadesVacante={vacante.habilidades} />
      </div>
    </div>
  );
}

export default function Postulantes({ params }: PageProps<"/empresa/vacantes/[id]/postulantes">) {
  return (
    <Suspense fallback={<Esqueleto />}>
      <Contenido params={params} />
    </Suspense>
  );
}
