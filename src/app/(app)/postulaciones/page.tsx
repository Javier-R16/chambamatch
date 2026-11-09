import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { Cargando, Titulo, Vacio } from "@/components/titulo";
import { requerirApp } from "@/lib/sesion";

export const metadata: Metadata = { title: "Mis postulaciones" };

type Postulacion = {
  job_id: string;
  titulo: string;
  empresa: string;
  logo_url: string | null;
  provincia: string;
  ciudad: string | null;
  direccion: "right" | "super";
  creado_en: string;
  match_id: string | null;
  estado: "enviada" | "match" | "cerrada";
};

// Nunca mostramos "rechazada": la decisión de la empresa no se expone.
const ESTADOS = {
  enviada: { texto: "Enviada", clase: "bg-zinc-100 text-zinc-700" },
  match: { texto: "¡Match!", clase: "bg-emerald-100 text-emerald-800" },
  cerrada: { texto: "Vacante cerrada", clase: "bg-zinc-100 text-zinc-500" },
} as const;

const fecha = new Intl.DateTimeFormat("es-PA", { day: "numeric", month: "short" });

async function Lista() {
  const { supabase } = await requerirApp("candidato");
  const { data } = await supabase.from("mis_postulaciones").select("*").order("creado_en", { ascending: false });
  const lista = (data ?? []) as Postulacion[];

  if (!lista.length) {
    return (
      <Vacio emoji="📝" titulo="Aún no te has postulado" texto="Desliza a la derecha en las vacantes que te interesen.">
        <Link href="/chambas" className="font-semibold text-rose-600">
          Ir a Chambas →
        </Link>
      </Vacio>
    );
  }

  return (
    <ul className="space-y-2 px-4 pb-6">
      {lista.map((p) => {
        const contenido = (
          <div className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-black/5">
            <Avatar src={p.logo_url} nombre={p.empresa} cuadrado />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{p.titulo}</p>
              <p className="truncate text-sm text-zinc-500">
                {p.empresa} · {p.ciudad ?? p.provincia}
              </p>
              <p className="text-xs text-zinc-400">
                {fecha.format(new Date(p.creado_en))}
                {p.direccion === "super" && " · ⭐ Súper Chamba"}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADOS[p.estado].clase}`}>
              {ESTADOS[p.estado].texto}
            </span>
          </div>
        );
        return (
          <li key={p.job_id}>{p.match_id ? <Link href={`/chat/${p.match_id}`}>{contenido}</Link> : contenido}</li>
        );
      })}
    </ul>
  );
}

export default function Postulaciones() {
  return (
    <>
      <Titulo>Mis postulaciones</Titulo>
      <Suspense fallback={<Cargando />}>
        <Lista />
      </Suspense>
    </>
  );
}
