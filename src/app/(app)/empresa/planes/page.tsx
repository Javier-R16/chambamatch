import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Cargando } from "@/components/titulo";
import { pagosHabilitados, precio, type Plan } from "@/lib/pagos/estado";
import { requerirApp } from "@/lib/sesion";
import { ComprarPlan } from "./comprar-plan";

export const metadata: Metadata = { title: "Planes para empresas" };

const fecha = new Intl.DateTimeFormat("es-PA", { day: "numeric", month: "short", year: "numeric" });
const ESTADOS: Record<string, string> = { pendiente: "Pendiente", pagado: "Pagado", fallido: "Fallido", reembolsado: "Reembolsado" };

async function Contenido({ searchParams }: { searchParams: Promise<{ pago?: string; vacante?: string }> }) {
  const { pago: resultadoPago, vacante } = await searchParams;
  const { supabase, uid } = await requerirApp("empresa");
  const { data: empresa } = await supabase.from("companies").select("id, vacantes_extra").eq("owner_id", uid).maybeSingle();
  if (!empresa) redirect("/onboarding");

  const [habilitados, { data: planes }, { data: vacantes }, { data: pagos }, { data: limite }] = await Promise.all([
    pagosHabilitados(supabase),
    supabase.from("planes").select("*").order("orden"),
    supabase.from("jobs").select("id, titulo, activa, destacada_hasta").eq("company_id", empresa.id).order("creado_en", { ascending: false }),
    supabase.from("pagos").select("id, plan_id, monto_centavos, estado, creado_en").order("creado_en", { ascending: false }).limit(10),
    supabase.from("config_app").select("valor").eq("clave", "vacantes_activas_gratis").maybeSingle(),
  ]);
  const activas = (vacantes ?? []).filter((v) => v.activa).length;
  const cupo = Number(limite?.valor ?? 3) + (empresa.vacantes_extra ?? 0);

  return (
    <div className="space-y-6 px-5 pb-10">
      {!habilitados && (
        <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          <b>Próximamente.</b> Por ahora publicar vacantes es gratis y sin límite. Estos son los planes que vendrán.
        </p>
      )}
      {resultadoPago === "ok" && <p className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">¡Pago recibido! Ya se aplicó a tu cuenta.</p>}
      {resultadoPago === "cancelado" && <p className="rounded-2xl bg-zinc-100 p-4 text-sm text-zinc-700">El pago se canceló. No se cobró nada.</p>}

      <section className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
        <p className="text-sm text-zinc-500">Vacantes activas</p>
        <p className="text-2xl font-black">
          {activas}
          {habilitados && <span className="text-base font-medium text-zinc-400"> de {cupo}</span>}
        </p>
      </section>

      <ComprarPlan
        habilitados={habilitados}
        planes={((planes ?? []) as Plan[]).map((p) => ({ ...p, precioTexto: precio(p.precio_centavos) }))}
        vacantes={(vacantes ?? []).filter((v) => v.activa).map((v) => ({ id: v.id, titulo: v.titulo, destacadaHasta: v.destacada_hasta }))}
        vacanteInicial={vacante ?? ""}
      />

      {pagos && pagos.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-bold">Historial de pagos</h2>
          <ul className="divide-y divide-zinc-100 rounded-2xl bg-white ring-1 ring-black/5">
            {pagos.map((p) => (
              <li key={p.id} className="flex items-center justify-between p-3 text-sm">
                <span>
                  <span className="block font-medium">{(planes ?? []).find((x) => x.id === p.plan_id)?.nombre ?? p.plan_id}</span>
                  <span className="text-zinc-500">{fecha.format(new Date(p.creado_en))}</span>
                </span>
                <span className="text-right">
                  <span className="block font-semibold">{precio(p.monto_centavos)}</span>
                  <span className="text-zinc-500">{ESTADOS[p.estado] ?? p.estado}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="text-center text-xs text-zinc-400">Precios en balboas (B/.), equivalentes a USD. Los candidatos siempre usan ChambaMatch gratis.</p>
    </div>
  );
}

export default function Planes({ searchParams }: PageProps<"/empresa/planes">) {
  return (
    <>
      <header className="flex items-center gap-2 px-3 pt-3 pb-2">
        <Link href="/empresa" aria-label="Volver" className="grid size-10 place-items-center rounded-full hover:bg-zinc-200">
          <ChevronLeft className="size-6" />
        </Link>
        <h1 className="text-2xl font-black">Planes</h1>
      </header>
      <Suspense fallback={<Cargando />}>
        <Contenido searchParams={searchParams as Promise<{ pago?: string; vacante?: string }>} />
      </Suspense>
    </>
  );
}
