import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con service role: SALTA RLS. Solo para rutas del servidor que ya
 * verificaron la identidad del usuario (entrevistas con IA).
 * La variable SUPABASE_SERVICE_ROLE_KEY nunca lleva prefijo NEXT_PUBLIC_.
 */
export function crearClienteAdmin() {
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!clave) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en el servidor");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
