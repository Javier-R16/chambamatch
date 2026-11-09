import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FormVacante } from "@/components/empresa/form-vacante";
import { Cargando, Titulo } from "@/components/titulo";
import { requerirApp } from "@/lib/sesion";

export const metadata: Metadata = { title: "Nueva vacante" };

async function Contenido() {
  const { supabase, uid } = await requerirApp("empresa");
  const { data: empresa } = await supabase.from("companies").select("id, provincia").eq("owner_id", uid).maybeSingle();
  if (!empresa) redirect("/onboarding");
  return <FormVacante companyId={empresa.id} provinciaEmpresa={empresa.provincia} vacante={null} />;
}

export default function NuevaVacante() {
  return (
    <>
      <Titulo>Nueva vacante</Titulo>
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </>
  );
}
