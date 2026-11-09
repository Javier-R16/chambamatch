"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Campo({ etiqueta, id, ayuda, children }: { etiqueta: string; id: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{etiqueta}</Label>
      {children}
      {ayuda && <p className="text-xs text-zinc-500">{ayuda}</p>}
    </div>
  );
}

// <select> nativo: en Android abre el selector del sistema, que es lo más cómodo.
export function Selector({
  id,
  valor,
  onCambio,
  opciones,
  vacio,
  requerido,
}: {
  id: string;
  valor: string;
  onCambio: (v: string) => void;
  opciones: readonly { valor: string; etiqueta: string }[] | readonly string[];
  vacio?: string;
  requerido?: boolean;
}) {
  return (
    <select
      id={id}
      value={valor}
      required={requerido}
      onChange={(e) => onCambio(e.target.value)}
      className="h-11 w-full rounded-xl border border-input bg-white px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {vacio !== undefined && <option value="">{vacio}</option>}
      {opciones.map((o) => {
        const op = typeof o === "string" ? { valor: o, etiqueta: o } : o;
        return (
          <option key={op.valor} value={op.valor}>
            {op.etiqueta}
          </option>
        );
      })}
    </select>
  );
}

export function EntradaHabilidades({ id, valor, onCambio }: { id: string; valor: string[]; onCambio: (v: string[]) => void }) {
  const [texto, setTexto] = useState("");

  const agregar = (crudo: string) => {
    const nuevas = crudo
      .split(",")
      .map((h) => h.trim())
      .filter((h) => h && !valor.some((v) => v.toLowerCase() === h.toLowerCase()));
    if (nuevas.length) onCambio([...valor, ...nuevas].slice(0, 20));
    setTexto("");
  };

  return (
    <div className="space-y-2">
      <Input
        id={id}
        value={texto}
        placeholder="Ej.: Excel, atención al cliente, inglés"
        enterKeyHint="done"
        className="bg-white"
        onChange={(e) => {
          if (e.target.value.endsWith(",")) agregar(e.target.value);
          else setTexto(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            agregar(texto);
          }
        }}
        onBlur={() => texto && agregar(texto)}
      />
      {valor.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {valor.map((h) => (
            <span key={h} className="inline-flex items-center gap-1 rounded-full bg-orange-100 py-1 pl-3 pr-1 text-sm text-orange-900">
              {h}
              <button
                type="button"
                aria-label={`Quitar ${h}`}
                className="grid size-6 place-items-center rounded-full hover:bg-orange-200"
                onClick={() => onCambio(valor.filter((x) => x !== h))}
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
