import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormCandidato } from "@/components/perfil/form-candidato";
import { BorrarCuenta, InstalarApp, Notificaciones } from "@/components/perfil/ajustes";
import { FormEmpresa } from "@/components/perfil/form-empresa";
import { Cargando, Titulo } from "@/components/titulo";
import { requerirApp } from "@/lib/sesion";
import type { Empresa, PerfilCandidato } from "@/lib/tipos";
import { CerrarSesion } from "./cerrar-sesion";

export const metadata: Metadata = { title: "Perfil" };

async function Contenido() {
  const { supabase, uid, perfil, email } = await requerirApp();
  const { data: contacto } = await supabase.from("contactos_privados").select("telefono").eq("user_id", uid).maybeSingle();

  let formulario: React.ReactNode;
  if (perfil.rol === "candidato") {
    const { data } = await supabase.from("candidate_profiles").select("*").eq("user_id", uid).maybeSingle<PerfilCandidato>();
    formulario = <FormCandidato uid={uid} perfil={perfil} candidato={data} telefono={contacto?.telefono ?? null} modo="editar" />;
  } else {
    const { data } = await supabase.from("companies").select("*").eq("owner_id", uid).maybeSingle<Empresa>();
    formulario = <FormEmpresa uid={uid} perfil={perfil} empresa={data} telefono={contacto?.telefono ?? null} modo="editar" />;
  }

  return (
    <div className="space-y-8 px-5 pb-10">
      <p className="text-sm text-zinc-500">
        {email} · {perfil.rol === "candidato" ? "Candidato/a" : "Empresa"}
      </p>
      <div className="space-y-3">
        <Notificaciones uid={uid} />
        <InstalarApp />
      </div>
      {formulario}
      <div className="space-y-3 border-t border-zinc-200 pt-6 text-sm">
        <Link href="/privacidad" className="block font-semibold text-zinc-700">
          Política de privacidad y tus derechos (Ley 81)
        </Link>
        <CerrarSesion />
        <BorrarCuenta uid={uid} />
      </div>
    </div>
  );
}

export default function Perfil() {
  return (
    <>
      <Titulo>Mi perfil</Titulo>
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </>
  );
}
