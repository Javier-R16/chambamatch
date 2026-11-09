import { redirect } from "next/navigation";
import { Suspense } from "react";
import { obtenerSesion, rutaInicio } from "@/lib/sesion";

// Decide a dónde va cada usuario después de entrar.
async function Redirigir(): Promise<null> {
  const { perfil } = await obtenerSesion();
  if (!perfil?.rol || !perfil.onboarding_completo) redirect("/onboarding");
  redirect(rutaInicio(perfil.rol));
}

export default function Inicio() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-zinc-500">Cargando…</p>}>
      <Redirigir />
    </Suspense>
  );
}
