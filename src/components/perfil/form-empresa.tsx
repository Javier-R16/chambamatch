"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/avatar";
import { Campo, Selector } from "@/components/formulario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PROVINCIAS } from "@/lib/constantes";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { subirArchivo } from "@/lib/subir";
import type { Empresa, Perfil } from "@/lib/tipos";

type Props = {
  uid: string;
  perfil: Perfil;
  empresa: Empresa | null;
  telefono: string | null;
  modo: "onboarding" | "editar";
};

export function FormEmpresa({ uid, perfil, empresa, telefono: telInicial, modo }: Props) {
  const supabase = crearClienteNavegador();
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);

  const [nombrePersona, setNombrePersona] = useState(perfil.nombre);
  const [telefono, setTelefono] = useState(telInicial ?? "");
  const [nombre, setNombre] = useState(empresa?.nombre ?? "");
  const [sector, setSector] = useState(empresa?.sector ?? "");
  const [provincia, setProvincia] = useState(empresa?.provincia ?? perfil.provincia ?? "");
  const [logo, setLogo] = useState<File | null>(null);

  const vistaLogo = logo ? URL.createObjectURL(logo) : empresa?.logo_url;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      const logo_url = logo ? await subirArchivo(supabase, "logos", uid, logo) : (empresa?.logo_url ?? null);
      const datos = { nombre: nombre.trim(), sector: sector.trim() || null, provincia: provincia || null, logo_url };
      const r1 = empresa
        ? await supabase.from("companies").update(datos).eq("id", empresa.id)
        : await supabase.from("companies").insert({ owner_id: uid, ...datos });
      if (r1.error) throw r1.error;

      const r2 = await supabase.from("contactos_privados").update({ telefono: telefono.trim() || null }).eq("user_id", uid);
      if (r2.error) throw new Error("Revisa el formato del teléfono (ej.: +507 6123-4567).");

      const r3 = await supabase
        .from("profiles")
        .update({ nombre: nombrePersona.trim(), provincia: provincia || null, onboarding_completo: true })
        .eq("id", uid);
      if (r3.error) throw r3.error;

      toast.success(modo === "onboarding" ? "¡Empresa creada! Publica tu primera vacante." : "Datos actualizados");
      if (modo === "onboarding") router.replace("/empresa");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar src={vistaLogo} nombre={nombre || "Empresa"} cuadrado className="size-20 text-2xl" />
        <label className="cursor-pointer text-sm font-semibold text-rose-600">
          {vistaLogo ? "Cambiar logo" : "Subir logo"}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
        </label>
      </div>
      <Campo etiqueta="Nombre de la empresa" id="empresa">
        <Input id="empresa" required value={nombre} onChange={(e) => setNombre(e.target.value)} className="bg-white" autoComplete="organization" />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Sector" id="sector">
          <Input id="sector" placeholder="Ej.: Retail, Logística" value={sector} onChange={(e) => setSector(e.target.value)} className="bg-white" />
        </Campo>
        <Campo etiqueta="Provincia" id="provincia">
          <Selector id="provincia" valor={provincia} onCambio={setProvincia} opciones={PROVINCIAS} vacio="Elige…" requerido />
        </Campo>
      </div>
      <Campo etiqueta="Tu nombre (reclutador/a)" id="persona">
        <Input id="persona" required value={nombrePersona} onChange={(e) => setNombrePersona(e.target.value)} className="bg-white" autoComplete="name" />
      </Campo>
      <Campo etiqueta="Teléfono de contacto" id="tel" ayuda="Solo lo verán los candidatos con los que hagas match.">
        <Input id="tel" type="tel" inputMode="tel" placeholder="+507 6123-4567" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="bg-white" />
      </Campo>
      <Button type="submit" className="h-12 w-full text-base font-bold" disabled={guardando}>
        {guardando ? "Guardando…" : modo === "onboarding" ? "Crear empresa" : "Guardar cambios"}
      </Button>
    </form>
  );
}
