"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MODALIDADES, PROVINCIAS } from "@/lib/constantes";
import type { Modalidad } from "@/lib/tipos";

export type Filtros = {
  provincias?: string[];
  modalidades?: Modalidad[];
  salario_min?: number | null;
};

export const cantidadFiltros = (f: Filtros) =>
  (f.provincias?.length ? 1 : 0) + (f.modalidades?.length ? 1 : 0) + (f.salario_min ? 1 : 0);

function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition-colors duration-150 ${
        activo ? "bg-rose-600 text-white ring-rose-600" : "bg-white text-zinc-700 ring-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

const alternar = <T,>(lista: T[] | undefined, valor: T) =>
  lista?.includes(valor) ? lista.filter((x) => x !== valor) : [...(lista ?? []), valor];

export function BotonFiltros({ filtros, onAplicar }: { filtros: Filtros; onAplicar: (f: Filtros) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [borrador, setBorrador] = useState<Filtros>(filtros);
  const n = cantidadFiltros(filtros);

  return (
    <Sheet
      open={abierto}
      onOpenChange={(o) => {
        setAbierto(o);
        if (o) setBorrador(filtros);
      }}
    >
      <SheetTrigger
        render={
          <button
            type="button"
            aria-label="Filtros"
            className="relative grid size-10 place-items-center rounded-full bg-white shadow-sm ring-1 ring-black/5"
          />
        }
      >
        <SlidersHorizontal className="size-5" />
        {n > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full bg-rose-600 text-[11px] font-bold text-white">
            {n}
          </span>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-zinc-50 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SheetHeader>
          <SheetTitle className="text-xl font-black">Filtros</SheetTitle>
          <SheetDescription>Las vacantes remotas se muestran siempre, sin importar la provincia.</SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-4">
          <section>
            <h3 className="mb-2 font-semibold">Modalidad</h3>
            <div className="flex flex-wrap gap-2">
              {MODALIDADES.map((m) => (
                <Chip
                  key={m.valor}
                  activo={!!borrador.modalidades?.includes(m.valor)}
                  onClick={() => setBorrador((b) => ({ ...b, modalidades: alternar(b.modalidades, m.valor) }))}
                >
                  {m.etiqueta}
                </Chip>
              ))}
            </div>
          </section>
          <section>
            <h3 className="mb-2 font-semibold">Provincias</h3>
            <div className="flex flex-wrap gap-2">
              {PROVINCIAS.map((p) => (
                <Chip
                  key={p}
                  activo={!!borrador.provincias?.includes(p)}
                  onClick={() => setBorrador((b) => ({ ...b, provincias: alternar(b.provincias, p) }))}
                >
                  {p}
                </Chip>
              ))}
            </div>
          </section>
          <section>
            <label htmlFor="smin" className="mb-2 block font-semibold">
              Salario mínimo mensual (B/.)
            </label>
            <Input
              id="smin"
              type="number"
              inputMode="numeric"
              min={0}
              step={50}
              placeholder="Sin mínimo"
              value={borrador.salario_min ?? ""}
              onChange={(e) => setBorrador((b) => ({ ...b, salario_min: e.target.value ? Number(e.target.value) : null }))}
              className="bg-white"
            />
          </section>
          <div className="flex gap-2 pb-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setBorrador({})}>
              Limpiar
            </Button>
            <Button
              type="button"
              className="flex-1 font-bold"
              onClick={() => {
                onAplicar(borrador);
                setAbierto(false);
              }}
            >
              Aplicar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
