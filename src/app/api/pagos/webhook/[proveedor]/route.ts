import { NextResponse } from "next/server";
import { proveedorPorId } from "@/lib/pagos/proveedor";
import { crearClienteAdmin } from "@/lib/supabase/admin";

// Notificación de la pasarela de pago (servidor a servidor). La firma la valida el proveedor.
export async function POST(request: Request, { params }: RouteContext<"/api/pagos/webhook/[proveedor]">) {
  const { proveedor: id } = await params;
  const proveedor = proveedorPorId(id);
  if (!proveedor || id !== process.env.PAGOS_PROVEEDOR) return NextResponse.json({ error: "Proveedor no válido" }, { status: 404 });

  const resultado = await proveedor.verificarWebhook(request);
  if (!resultado) return NextResponse.json({ error: "Firma inválida" }, { status: 400 });

  const admin = crearClienteAdmin();
  const { data: pago } = await admin.from("pagos").select("id").eq("referencia_externa", resultado.referencia).maybeSingle();
  if (!pago) return NextResponse.json({ error: "Pago desconocido" }, { status: 404 });

  if (resultado.estado === "pagado") await admin.rpc("aplicar_pago", { p_pago: pago.id });
  else await admin.from("pagos").update({ estado: "fallido" }).eq("id", pago.id).eq("estado", "pendiente");

  return NextResponse.json({ ok: true });
}
