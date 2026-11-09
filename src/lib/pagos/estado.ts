import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { proveedorActivo } from "./proveedor";

/** Los pagos solo funcionan si están activos en la BD Y hay un proveedor configurado. */
export async function pagosHabilitados(supabase: SupabaseClient) {
  const { data } = await supabase.rpc("pagos_activos");
  return Boolean(data) && proveedorActivo() !== null;
}

export type Plan = {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: "destacada" | "paquete";
  precio_centavos: number;
  dias: number | null;
  vacantes_extra: number | null;
};

export const precio = (centavos: number) =>
  `B/. ${(centavos / 100).toLocaleString("es-PA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
