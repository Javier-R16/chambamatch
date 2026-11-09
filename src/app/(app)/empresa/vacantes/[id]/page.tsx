import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormVacante } from "@/components/empresa/form-vacante";
import { Cargando, Titulo } from "@/components/titulo";
import { requerirApp } from "@/lib/sesion";
import type { Vacante } from "@/lib/tipos";

export const metadata: Metadata = { title: "Editar vacante" };

async function Contenido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requerirApp("empresa");
  // RLS: solo devuelve la vacante si es de mi empresa (o está activa; validamos abajo)
  const { data: vacante } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle<Vacante>();
  const { data: miEmpresa } = await supabase.rpc("mi_company_id");
  if (!vacante || vacante.company_id !== miEmpresa) notFound();
  return <FormVacante companyId={vacante.company_id} provinciaEmpresa={null} vacante={vacante} />;
}

export default function EditarVacante({ params }: PageProps<"/empresa/vacantes/[id]">) {
  return (
    <>
      <Titulo>Editar vacante</Titulo>
      <Suspense fallback={<Cargando />}>
        <Contenido params={params} />
      </Suspense>
    </>
  );
}
