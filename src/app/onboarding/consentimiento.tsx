"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { VERSION_CONSENTIMIENTO } from "@/lib/constantes";
import { crearClienteNavegador } from "@/lib/supabase/client";

export function Consentimiento({ uid }: { uid: string }) {
  const supabase = crearClienteNavegador();
  const router = useRouter();
  const [acepto, setAcepto] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function aceptar() {
    setEnviando(true);
    const { error } = await supabase
      .from("consentimientos")
      .insert({ user_id: uid, tipo: "datos_personales", version: VERSION_CONSENTIMIENTO });
    setEnviando(false);
    if (error) return void toast.error("No se pudo guardar. Intenta de nuevo.");
    router.refresh();
  }

  return (
    <div>
      <p className="text-sm font-semibold text-rose-600">Paso 2 de 3</p>
      <h1 className="mt-1 text-3xl font-black">Tus datos, tus reglas</h1>
      <p className="mt-2 text-zinc-600">Según la Ley 81 de 2019 de Protección de Datos Personales de Panamá, necesitamos tu permiso.</p>

      <ul className="mt-6 space-y-3 rounded-2xl bg-white p-5 text-[15px] text-zinc-700 ring-1 ring-black/5">
        <li>
          <b>Qué guardamos:</b> nombre, foto, provincia, perfil profesional, teléfono, correo y CV.
        </li>
        <li>
          <b>Para qué:</b> mostrar tu perfil o tus vacantes, crear matches y permitir el chat.
        </li>
        <li>
          <b>Quién lo ve:</b> tu perfil profesional, solo las empresas a las que te postulas. Teléfono, correo y CV, solo
          tus matches.
        </li>
        <li>
          <b>Tus derechos:</b> puedes acceder, corregir, cancelar u oponerte (ARCO) desde Perfil o escribiéndonos. Puedes
          retirar este permiso y borrar tu cuenta cuando quieras.
        </li>
        <li>
          <b>Dónde:</b> en servidores de Supabase (proveedor en la nube). No vendemos tus datos.
        </li>
      </ul>

      <label className="mt-5 flex items-start gap-3 text-[15px]">
        <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} className="mt-1 size-5 accent-rose-600" />
        <span>
          Acepto el tratamiento de mis datos personales según la{" "}
          <Link href="/privacidad" target="_blank" className="font-semibold text-rose-600 underline">
            política de privacidad
          </Link>
          .
        </span>
      </label>

      <Button className="mt-8 h-12 w-full text-base font-bold" disabled={!acepto || enviando} onClick={aceptar}>
        Acepto y continúo
      </Button>
    </div>
  );
}
