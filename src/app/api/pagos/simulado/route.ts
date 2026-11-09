import { NextResponse } from "next/server";
import { error, leerCuerpo, usuarioActual } from "@/lib/entrevista-servidor";
import { proveedorActivo } from "@/lib/pagos/proveedor";
import { crearClienteAdmin } from "@/lib/supabase/admin";

// Solo desarrollo: confirma un pago con el proveedor "simulado" (no cobra nada).
export async function POST(request: Request) {
  if (proveedorActivo()?.id !== "simulado") return error("No disponible", 404);
  const { supabase, uid } = await usuarioActual();
  if (!uid) return error("No autorizado", 401);
  const { pagoId, aprobar } = await leerCuerpo<{ pagoId: string; aprobar: boolean }>(request);

  // RLS: solo ve sus propios pagos
  const { data: pago } = await supabase.from("pagos").select("id, estado").eq("id", pagoId ?? "").maybeSingle();
  if (!pago || pago.estado !== "pendiente") return error("Pago no encontrado", 404);

  const admin = crearClienteAdmin();
  if (aprobar) await admin.rpc("aplicar_pago", { p_pago: pago.id });
  else await admin.from("pagos").update({ estado: "fallido" }).eq("id", pago.id);
  return NextResponse.json({ ok: true });
}
