import { NextResponse } from "next/server";
import { error, leerCuerpo, usuarioActual } from "@/lib/entrevista-servidor";
import { pagosHabilitados, type Plan } from "@/lib/pagos/estado";
import { proveedorActivo } from "@/lib/pagos/proveedor";
import { crearClienteAdmin } from "@/lib/supabase/admin";

// La EMPRESA compra un plan. Crea el pago "pendiente" y devuelve la URL del checkout.
export async function POST(request: Request) {
  const { supabase, uid } = await usuarioActual();
  if (!uid) return error("No autorizado", 401);
  if (!(await pagosHabilitados(supabase))) return error("Los pagos todavía no están disponibles", 503);

  const { planId, jobId } = await leerCuerpo<{ planId: string; jobId: string }>(request);
  const { data: companyId } = await supabase.rpc("mi_company_id");
  if (!companyId) return error("Solo para empresas", 403);

  const { data: plan } = await supabase.from("planes").select("*").eq("id", planId ?? "").maybeSingle<Plan>();
  if (!plan) return error("Plan no encontrado", 404);

  if (plan.tipo === "destacada") {
    const { data: job } = await supabase.from("jobs").select("id, company_id").eq("id", jobId ?? "").maybeSingle();
    if (!job || job.company_id !== companyId) return error("Elige una de tus vacantes", 400);
  }

  const admin = crearClienteAdmin();
  const proveedor = proveedorActivo()!;
  const { data: pago, error: e } = await admin
    .from("pagos")
    .insert({
      company_id: companyId,
      plan_id: plan.id,
      job_id: plan.tipo === "destacada" ? jobId : null,
      monto_centavos: plan.precio_centavos,
      proveedor: proveedor.id,
    })
    .select("id")
    .single();
  if (e) return error("No se pudo crear el pago", 500);

  const origen = new URL(request.url).origin;
  const { url, referencia } = await proveedor.crearCheckout({
    pagoId: pago.id,
    montoCentavos: plan.precio_centavos,
    moneda: "USD",
    descripcion: `ChambaMatch · ${plan.nombre}`,
    urlExito: `${origen}/empresa/planes?pago=ok`,
    urlCancelar: `${origen}/empresa/planes?pago=cancelado`,
  });
  await admin.from("pagos").update({ referencia_externa: referencia }).eq("id", pago.id);
  return NextResponse.json({ url });
}
