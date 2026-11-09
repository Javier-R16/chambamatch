import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FormCandidato } from "@/components/perfil/form-candidato";
import { FormEmpresa } from "@/components/perfil/form-empresa";
import { VERSION_CONSENTIMIENTO } from "@/lib/constantes";
import { obtenerSesion, rutaInicio } from "@/lib/sesion";
import { Consentimiento } from "./consentimiento";
import { ElegirRol } from "./elegir-rol";

export const metadata: Metadata = { title: "Bienvenida" };

async function Paso() {
  const { supabase, uid, perfil } = await obtenerSesion();
  if (!perfil) redirect("/entrar");

  if (!perfil.rol) return <ElegirRol />;

  const { data: consentimiento } = await supabase
    .from("consentimientos")
    .select("id")
    .eq("user_id", uid)
    .eq("tipo", "datos_personales")
    .eq("version", VERSION_CONSENTIMIENTO)
    .is("revocado_en", null)
    .maybeSingle();
  if (!consentimiento) return <Consentimiento uid={uid} />;

  if (perfil.onboarding_completo) redirect(rutaInicio(perfil.rol));

  const { data: contacto } = await supabase.from("contactos_privados").select("telefono").eq("user_id", uid).maybeSingle();

  return (
    <>
      <Encabezado
        paso={3}
        titulo={perfil.rol === "candidato" ? "Arma tu perfil" : "Datos de tu empresa"}
        texto={
          perfil.rol === "candidato"
            ? "Así te verán las empresas cuando te postules. Teléfono, correo y CV quedan ocultos hasta que haya match."
            : "Así te verán los candidatos en cada vacante."
        }
      />
      {perfil.rol === "candidato" ? (
        <FormCandidato uid={uid} perfil={perfil} candidato={null} telefono={contacto?.telefono ?? null} modo="onboarding" />
      ) : (
        <FormEmpresa uid={uid} perfil={perfil} empresa={null} telefono={contacto?.telefono ?? null} modo="onboarding" />
      )}
    </>
  );
}

function Encabezado({ paso, titulo, texto }: { paso: number; titulo: string; texto: string }) {
  return (
    <div className="mb-6">
      <p className="text-sm font-semibold text-rose-600">Paso {paso} de 3</p>
      <h1 className="mt-1 text-3xl font-black">{titulo}</h1>
      <p className="mt-2 text-zinc-600">{texto}</p>
    </div>
  );
}

export default function Onboarding() {
  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 py-8">
      <Suspense fallback={<p className="text-zinc-500">Cargando…</p>}>
        <Paso />
      </Suspense>
    </main>
  );
}
