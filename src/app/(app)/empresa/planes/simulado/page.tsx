import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Cargando } from "@/components/titulo";
import { precio } from "@/lib/pagos/estado";
import { proveedorActivo } from "@/lib/pagos/proveedor";
import { requerirApp } from "@/lib/sesion";
import { BotonesSimulado } from "./botones";

export const metadata: Metadata = { title: "Pago de prueba" };

// Pasarela FALSA para desarrollo. Desaparece en producción.
async function Contenido({ searchParams }: { searchParams: Promise<{ pago?: string }> }) {
  if (proveedorActivo()?.id !== "simulado") notFound();
  const { pago: id } = await searchParams;
  const { supabase } = await requerirApp("empresa");
  const { data: pago } = await supabase.from("pagos").select("id, plan_id, monto_centavos, estado").eq("id", id ?? "").maybeSingle();
  if (!pago) notFound();

  return (
    <div className="space-y-6 px-5 py-8 text-center">
      <p className="rounded-xl bg-amber-100 p-3 text-sm font-semibold text-amber-900">⚠️ Pasarela de PRUEBA: no se cobra nada</p>
      <p className="text-zinc-500">{pago.plan_id}</p>
      <p className="text-4xl font-black">{precio(pago.monto_centavos)}</p>
      {pago.estado === "pendiente" ? <BotonesSimulado pagoId={pago.id} /> : <p>Este pago ya está {pago.estado}.</p>}
    </div>
  );
}

export default function PagoSimulado({ searchParams }: PageProps<"/empresa/planes/simulado">) {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido searchParams={searchParams as Promise<{ pago?: string }>} />
    </Suspense>
  );
}
