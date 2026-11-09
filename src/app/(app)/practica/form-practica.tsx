"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { TextoConsentimientoIA } from "@/components/entrevista/consentimiento-ia";
import { Campo, Selector } from "@/components/formulario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = { vacantes: { id: string; etiqueta: string }[]; puestoSugerido: string; necesitaConsentimiento: boolean };

export function FormPractica({ vacantes, puestoSugerido, necesitaConsentimiento }: Props) {
  const router = useRouter();
  const [jobId, setJobId] = useState("");
  const [titulo, setTitulo] = useState(puestoSugerido);
  const [consiento, setConsiento] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function empezar(e: React.FormEvent) {
    e.preventDefault();
    if (necesitaConsentimiento && !consiento) return void toast("Marca la casilla de consentimiento para continuar.");
    setEnviando(true);
    const r = await fetch("/api/entrevista/practica", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: jobId || null, titulo: jobId ? null : titulo, consiento }),
    });
    const datos = await r.json().catch(() => ({}));
    if (!r.ok) {
      setEnviando(false);
      return void toast.error(datos.error ?? "No se pudo empezar");
    }
    router.push(`/entrevista/${datos.id}`);
  }

  return (
    <form onSubmit={empezar} className="space-y-4 rounded-3xl bg-white p-5 ring-1 ring-black/5">
      {vacantes.length > 0 && (
        <Campo etiqueta="Practicar para una de tus postulaciones" id="vacante">
          <Selector id="vacante" valor={jobId} onCambio={setJobId} opciones={vacantes.map((v) => ({ valor: v.id, etiqueta: v.etiqueta }))} vacio="— Otro puesto —" />
        </Campo>
      )}
      {!jobId && (
        <Campo etiqueta="Puesto" id="puesto">
          <Input id="puesto" required maxLength={80} placeholder="Ej.: Cajera, Vendedor, Desarrollador" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="bg-white" />
        </Campo>
      )}
      {necesitaConsentimiento && (
        <label className="flex items-start gap-3 text-sm text-zinc-700">
          <input type="checkbox" checked={consiento} onChange={(e) => setConsiento(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-rose-600" />
          <TextoConsentimientoIA />
        </label>
      )}
      <Button type="submit" className="h-12 w-full text-base font-bold" disabled={enviando}>
        {enviando ? "Preparando…" : "Empezar práctica"}
      </Button>
      <p className="text-center text-xs text-zinc-400">Hasta 3 prácticas por día · Funciona mejor en Chrome</p>
    </form>
  );
}
