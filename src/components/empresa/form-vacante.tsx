"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Campo, EntradaHabilidades, Selector } from "@/components/formulario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CONTRATOS, MODALIDADES, PROVINCIAS } from "@/lib/constantes";
import { crearClienteNavegador } from "@/lib/supabase/client";
import type { Modalidad, TipoContrato, Vacante } from "@/lib/tipos";

type Props = { companyId: string; provinciaEmpresa: string | null; vacante: Vacante | null };

export function FormVacante({ companyId, provinciaEmpresa, vacante }: Props) {
  const supabase = crearClienteNavegador();
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);

  const [titulo, setTitulo] = useState(vacante?.titulo ?? "");
  const [descripcion, setDescripcion] = useState(vacante?.descripcion ?? "");
  const [salarioMin, setSalarioMin] = useState(vacante?.salario_min ? String(vacante.salario_min) : "");
  const [salarioMax, setSalarioMax] = useState(vacante?.salario_max ? String(vacante.salario_max) : "");
  const [modalidad, setModalidad] = useState<string>(vacante?.modalidad ?? "presencial");
  const [provincia, setProvincia] = useState(vacante?.provincia ?? provinciaEmpresa ?? "Panamá");
  const [ciudad, setCiudad] = useState(vacante?.ciudad ?? "");
  const [contrato, setContrato] = useState<string>(vacante?.tipo_contrato ?? "indefinido");
  const [habilidades, setHabilidades] = useState<string[]>(vacante?.habilidades ?? []);
  const [activa, setActiva] = useState(vacante?.activa ?? true);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    const min = salarioMin ? Number(salarioMin) : null;
    const max = salarioMax ? Number(salarioMax) : null;
    if (min && max && min > max) return void toast.error("El salario mínimo no puede ser mayor que el máximo.");
    setGuardando(true);
    const datos = {
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      salario_min: min,
      salario_max: max,
      modalidad: modalidad as Modalidad,
      provincia,
      ciudad: ciudad.trim() || null,
      tipo_contrato: contrato as TipoContrato,
      habilidades,
      activa,
    };
    const { error } = vacante
      ? await supabase.from("jobs").update(datos).eq("id", vacante.id)
      : await supabase.from("jobs").insert({ company_id: companyId, ...datos });
    setGuardando(false);
    if (error) return void toast.error(error.code === "P0001" ? error.message : "No se pudo guardar la vacante.");
    toast.success(vacante ? "Vacante actualizada" : "¡Vacante publicada!");
    router.replace("/empresa");
    router.refresh();
  }

  async function borrar() {
    if (!vacante) return;
    const { error } = await supabase.from("jobs").delete().eq("id", vacante.id);
    if (error) return void toast.error("No se pudo borrar.");
    toast.success("Vacante borrada");
    router.replace("/empresa");
    router.refresh();
  }

  return (
    <form onSubmit={guardar} className="space-y-5 px-5 pb-10">
      <Campo etiqueta="Puesto" id="titulo">
        <Input id="titulo" required maxLength={80} placeholder="Ej.: Cajero/a, Vendedor de piso" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="bg-white" />
      </Campo>
      <Campo etiqueta="Descripción" id="desc" ayuda="Funciones, horario, beneficios. Sé claro y breve.">
        <Textarea id="desc" required rows={6} maxLength={2000} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="bg-white" />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Salario mín. (B/.)" id="smin">
          <Input id="smin" type="number" inputMode="numeric" min={0} value={salarioMin} onChange={(e) => setSalarioMin(e.target.value)} className="bg-white" />
        </Campo>
        <Campo etiqueta="Salario máx. (B/.)" id="smax">
          <Input id="smax" type="number" inputMode="numeric" min={0} value={salarioMax} onChange={(e) => setSalarioMax(e.target.value)} className="bg-white" />
        </Campo>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Modalidad" id="mod">
          <Selector id="mod" valor={modalidad} onCambio={setModalidad} opciones={MODALIDADES} />
        </Campo>
        <Campo etiqueta="Contrato" id="contrato">
          <Selector id="contrato" valor={contrato} onCambio={setContrato} opciones={CONTRATOS} />
        </Campo>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Provincia" id="prov">
          <Selector id="prov" valor={provincia} onCambio={setProvincia} opciones={PROVINCIAS} />
        </Campo>
        <Campo etiqueta="Ciudad" id="ciudad">
          <Input id="ciudad" placeholder="Ej.: David" value={ciudad} onChange={(e) => setCiudad(e.target.value)} className="bg-white" />
        </Campo>
      </div>
      <Campo etiqueta="Habilidades requeridas" id="hab" ayuda="Las usamos para ordenar postulantes por coincidencia.">
        <EntradaHabilidades id="hab" valor={habilidades} onCambio={setHabilidades} />
      </Campo>
      {vacante && (
        <label className="flex items-center justify-between rounded-xl bg-white p-4 ring-1 ring-black/5">
          <span>
            <span className="block font-semibold">Vacante activa</span>
            <span className="block text-sm text-zinc-500">Si la cierras, las postulaciones pendientes pasan a «cerrada».</span>
          </span>
          <input type="checkbox" checked={activa} onChange={(e) => setActiva(e.target.checked)} className="size-6 accent-rose-600" />
        </label>
      )}
      <Button type="submit" className="h-12 w-full text-base font-bold" disabled={guardando}>
        {guardando ? "Guardando…" : vacante ? "Guardar cambios" : "Publicar vacante"}
      </Button>
      {vacante &&
        (confirmarBorrado ? (
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setConfirmarBorrado(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" className="flex-1 font-bold" onClick={borrar}>
              Sí, borrar (también sus matches)
            </Button>
          </div>
        ) : (
          <Button type="button" variant="ghost" className="w-full text-rose-600" onClick={() => setConfirmarBorrado(true)}>
            Borrar vacante
          </Button>
        ))}
    </form>
  );
}
