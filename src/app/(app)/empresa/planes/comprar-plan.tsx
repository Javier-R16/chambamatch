"use client";

import { Package, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Selector } from "@/components/formulario";
import { Button } from "@/components/ui/button";
import type { Plan } from "@/lib/pagos/estado";

type Props = {
  habilitados: boolean;
  planes: (Plan & { precioTexto: string })[];
  vacantes: { id: string; titulo: string; destacadaHasta: string | null }[];
  vacanteInicial: string;
};

const fecha = new Intl.DateTimeFormat("es-PA", { day: "numeric", month: "short" });

export function ComprarPlan({ habilitados, planes, vacantes, vacanteInicial }: Props) {
  const [jobId, setJobId] = useState(vacanteInicial || vacantes[0]?.id || "");
  const [comprando, setComprando] = useState<string | null>(null);

  async function comprar(plan: Plan) {
    setComprando(plan.id);
    const r = await fetch("/api/pagos/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan.id, jobId: plan.tipo === "destacada" ? jobId : null }),
    });
    const datos = await r.json().catch(() => ({}));
    setComprando(null);
    if (!r.ok) return void toast.error(datos.error ?? "No se pudo iniciar el pago");
    window.location.assign(datos.url);
  }

  const destacadas = planes.filter((p) => p.tipo === "destacada");
  const paquetes = planes.filter((p) => p.tipo === "paquete");
  const elegida = vacantes.find((v) => v.id === jobId);
  const vigente = elegida?.destacadaHasta && new Date(elegida.destacadaHasta) > new Date();

  return (
    <>
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Star className="size-5 text-amber-500" fill="currentColor" /> Destacar una vacante
        </h2>
        <p className="text-sm text-zinc-600">Aparece primero en el feed, con la etiqueta «Destacada».</p>
        {vacantes.length > 0 ? (
          <Selector id="vacante" valor={jobId} onCambio={setJobId} opciones={vacantes.map((v) => ({ valor: v.id, etiqueta: v.titulo }))} />
        ) : (
          <p className="text-sm text-zinc-500">Publica una vacante activa para poder destacarla.</p>
        )}
        {vigente && <p className="text-sm text-amber-700">⭐ Ya está destacada hasta el {fecha.format(new Date(elegida!.destacadaHasta!))}. Si compras, se suman los días.</p>}
        {destacadas.map((p) => (
          <TarjetaPlan key={p.id} plan={p} deshabilitado={!habilitados || !jobId} cargando={comprando === p.id} onComprar={() => comprar(p)} />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Package className="size-5 text-sky-600" /> Paquetes de vacantes
        </h2>
        <p className="text-sm text-zinc-600">Más vacantes activas al mismo tiempo. No vencen.</p>
        {paquetes.map((p) => (
          <TarjetaPlan key={p.id} plan={p} deshabilitado={!habilitados} cargando={comprando === p.id} onComprar={() => comprar(p)} />
        ))}
      </section>
    </>
  );
}

function TarjetaPlan({
  plan,
  deshabilitado,
  cargando,
  onComprar,
}: {
  plan: Plan & { precioTexto: string };
  deshabilitado: boolean;
  cargando: boolean;
  onComprar: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{plan.nombre}</p>
        <p className="text-sm text-zinc-500">{plan.descripcion}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-black">{plan.precioTexto}</p>
        <Button size="sm" className="mt-1 h-9 px-3 font-semibold" disabled={deshabilitado || cargando} onClick={onComprar}>
          {cargando ? "…" : "Comprar"}
        </Button>
      </div>
    </div>
  );
}
