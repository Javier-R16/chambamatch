import { redirect } from "next/navigation";
import { cache } from "react";
import { crearClienteServidor } from "./supabase/server";
import type { Perfil, Rol } from "./tipos";

// Lee la sesión y el perfil. Redirige a /entrar si no hay sesión.
export const obtenerSesion = cache(async () => {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) redirect("/entrar");

  const { data: perfil } = await supabase.from("profiles").select("*").eq("id", uid).single<Perfil>();
  return { supabase, uid, perfil, email: (data.claims.email as string | undefined) ?? null };
});

// Exige onboarding completo (y opcionalmente un rol) para las pantallas de la app.
export async function requerirApp(rol?: Rol) {
  const sesion = await obtenerSesion();
  const { perfil } = sesion;
  if (!perfil?.rol || !perfil.onboarding_completo) redirect("/onboarding");
  if (rol && perfil.rol !== rol) redirect(rutaInicio(perfil.rol));
  return { ...sesion, perfil: perfil as Perfil & { rol: Rol } };
}

export const rutaInicio = (rol: Rol) => (rol === "empresa" ? "/empresa" : "/chambas");
