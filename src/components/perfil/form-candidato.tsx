"use client";

import { FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/avatar";
import { Campo, EntradaHabilidades, Selector } from "@/components/formulario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MODALIDADES, PROVINCIAS } from "@/lib/constantes";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { subirArchivo } from "@/lib/subir";
import type { Modalidad, Perfil, PerfilCandidato } from "@/lib/tipos";

type Props = {
  uid: string;
  perfil: Perfil;
  candidato: PerfilCandidato | null;
  telefono: string | null;
  modo: "onboarding" | "editar";
};

export function FormCandidato({ uid, perfil, candidato, telefono: telInicial, modo }: Props) {
  const supabase = crearClienteNavegador();
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);

  const [nombre, setNombre] = useState(perfil.nombre);
  const [provincia, setProvincia] = useState(perfil.provincia ?? "");
  const [telefono, setTelefono] = useState(telInicial ?? "");
  const [foto, setFoto] = useState<File | null>(null);
  const [titulo, setTitulo] = useState(candidato?.titulo ?? "");
  const [anios, setAnios] = useState(String(candidato?.anios_experiencia ?? 0));
  const [habilidades, setHabilidades] = useState<string[]>(candidato?.habilidades ?? []);
  const [salario, setSalario] = useState(candidato?.salario_esperado ? String(candidato.salario_esperado) : "");
  const [modalidad, setModalidad] = useState<string>(candidato?.modalidad ?? "");
  const [disponibilidad, setDisponibilidad] = useState(candidato?.disponibilidad ?? "");
  const [bio, setBio] = useState(candidato?.bio ?? "");
  const [cv, setCv] = useState<File | null>(null);

  const vistaFoto = foto ? URL.createObjectURL(foto) : perfil.foto_url;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (habilidades.length === 0) return void toast.error("Agrega al menos una habilidad.");
    setGuardando(true);
    try {
      const foto_url = foto ? await subirArchivo(supabase, "avatars", uid, foto) : perfil.foto_url;
      const cv_url = cv ? await subirArchivo(supabase, "cvs", uid, cv) : (candidato?.cv_url ?? null);

      const datos = {
        titulo: titulo.trim(),
        anios_experiencia: Number(anios) || 0,
        habilidades,
        salario_esperado: salario ? Number(salario) : null,
        modalidad: (modalidad || null) as Modalidad | null,
        disponibilidad: disponibilidad.trim() || null,
        bio: bio.trim() || null,
        cv_url,
      };
      const r1 = candidato
        ? await supabase.from("candidate_profiles").update({ ...datos, actualizado_en: new Date().toISOString() }).eq("user_id", uid)
        : await supabase.from("candidate_profiles").insert({ user_id: uid, ...datos });
      if (r1.error) throw r1.error;

      const r2 = await supabase
        .from("contactos_privados")
        .update({ telefono: telefono.trim() || null })
        .eq("user_id", uid);
      if (r2.error) throw new Error("Revisa el formato del teléfono (ej.: +507 6123-4567).");

      const r3 = await supabase
        .from("profiles")
        .update({ nombre: nombre.trim(), provincia: provincia || null, foto_url, onboarding_completo: true })
        .eq("id", uid);
      if (r3.error) throw r3.error;

      toast.success(modo === "onboarding" ? "¡Listo! A deslizar." : "Perfil actualizado");
      if (modo === "onboarding") router.replace("/chambas");
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
        <Avatar src={vistaFoto} nombre={nombre} className="size-20 text-2xl" />
        <label className="cursor-pointer text-sm font-semibold text-rose-600">
          {vistaFoto ? "Cambiar foto" : "Subir foto"}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
        </label>
      </div>

      <Campo etiqueta="Nombre completo" id="nombre">
        <Input id="nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} className="bg-white" autoComplete="name" />
      </Campo>
      <Campo etiqueta="¿Qué puesto buscas?" id="titulo">
        <Input id="titulo" required placeholder="Ej.: Cajera, Desarrollador web, Chofer" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="bg-white" />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Años de experiencia" id="anios">
          <Input id="anios" type="number" inputMode="numeric" min={0} max={60} value={anios} onChange={(e) => setAnios(e.target.value)} className="bg-white" />
        </Campo>
        <Campo etiqueta="Salario esperado (B/.)" id="salario">
          <Input id="salario" type="number" inputMode="numeric" min={0} placeholder="Mensual" value={salario} onChange={(e) => setSalario(e.target.value)} className="bg-white" />
        </Campo>
      </div>
      <Campo etiqueta="Habilidades" id="habilidades" ayuda="Escribe y presiona Enter o coma. Las usamos para ordenar tus vacantes.">
        <EntradaHabilidades id="habilidades" valor={habilidades} onCambio={setHabilidades} />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Provincia" id="provincia">
          <Selector id="provincia" valor={provincia} onCambio={setProvincia} opciones={PROVINCIAS} vacio="Elige…" requerido />
        </Campo>
        <Campo etiqueta="Modalidad" id="modalidad">
          <Selector id="modalidad" valor={modalidad} onCambio={setModalidad} opciones={MODALIDADES} vacio="Cualquiera" />
        </Campo>
      </div>
      <Campo etiqueta="Disponibilidad" id="disp">
        <Input id="disp" placeholder="Ej.: Inmediata, en 15 días" value={disponibilidad} onChange={(e) => setDisponibilidad(e.target.value)} className="bg-white" />
      </Campo>
      <Campo etiqueta="Sobre ti" id="bio">
        <Textarea id="bio" maxLength={1000} rows={4} placeholder="Cuéntale a las empresas qué te hace buena opción." value={bio} onChange={(e) => setBio(e.target.value)} className="bg-white" />
      </Campo>
      <Campo etiqueta="Teléfono" id="tel" ayuda="Solo lo verán las empresas con las que hagas match.">
        <Input id="tel" type="tel" inputMode="tel" autoComplete="tel" placeholder="+507 6123-4567" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="bg-white" />
      </Campo>
      <Campo etiqueta="CV en PDF (opcional)" id="cv" ayuda="Máx. 5 MB. Solo lo verán las empresas con las que hagas match.">
        <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-white px-3 text-sm text-zinc-600">
          <FileText className="size-4" />
          {cv ? cv.name : candidato?.cv_url ? "CV cargado · toca para reemplazar" : "Elegir archivo"}
          <input id="cv" type="file" accept="application/pdf" className="sr-only" onChange={(e) => setCv(e.target.files?.[0] ?? null)} />
        </label>
      </Campo>

      <Button type="submit" className="h-12 w-full text-base font-bold" disabled={guardando}>
        {guardando ? "Guardando…" : modo === "onboarding" ? "Empezar a deslizar" : "Guardar cambios"}
      </Button>
    </form>
  );
}
