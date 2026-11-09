"use client";

import { Building2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { crearClienteNavegador } from "@/lib/supabase/client";
import type { Rol } from "@/lib/tipos";

const OPCIONES: { rol: Rol; titulo: string; texto: string; icono: typeof UserRound }[] = [
  { rol: "candidato", titulo: "Busco chamba", texto: "Desliza vacantes y postúlate en un toque.", icono: UserRound },
  { rol: "empresa", titulo: "Busco personal", texto: "Publica vacantes y elige a tus candidatos.", icono: Building2 },
];

export function ElegirRol() {
  const supabase = crearClienteNavegador();
  const router = useRouter();
  const [rol, setRol] = useState<Rol | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function confirmar() {
    if (!rol) return;
    setEnviando(true);
    const { error } = await supabase.rpc("elegir_rol", { p_rol: rol });
    setEnviando(false);
    if (error) return void toast.error("No se pudo guardar. Intenta de nuevo.");
    router.refresh();
  }

  return (
    <div>
      <p className="text-sm font-semibold text-rose-600">Paso 1 de 3</p>
      <h1 className="mt-1 text-3xl font-black">¿Qué te trae por aquí?</h1>
      <p className="mt-2 text-zinc-600">Esto no se puede cambiar después. Si necesitas ambos, usa otra cuenta.</p>
      <div className="mt-6 space-y-3">
        {OPCIONES.map(({ rol: r, titulo, texto, icono: Icono }) => (
          <button
            key={r}
            type="button"
            aria-pressed={rol === r}
            onClick={() => setRol(r)}
            className={`flex w-full items-center gap-4 rounded-2xl bg-white p-5 text-left ring-2 transition-[box-shadow,transform] duration-150 ease-out active:scale-[0.98] ${
              rol === r ? "ring-rose-500 shadow-md" : "ring-black/5"
            }`}
          >
            <span className={`grid size-12 place-items-center rounded-xl ${rol === r ? "bg-rose-500 text-white" : "bg-zinc-100 text-zinc-600"}`}>
              <Icono className="size-6" />
            </span>
            <span>
              <span className="block text-lg font-bold">{titulo}</span>
              <span className="block text-sm text-zinc-600">{texto}</span>
            </span>
          </button>
        ))}
      </div>
      <Button className="mt-8 h-12 w-full text-base font-bold" disabled={!rol || enviando} onClick={confirmar}>
        Continuar
      </Button>
    </div>
  );
}
