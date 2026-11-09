import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { Cargando, Titulo, Vacio } from "@/components/titulo";
import { requerirApp } from "@/lib/sesion";

export const metadata: Metadata = { title: "Matches" };

type FilaMatch = {
  id: string;
  creado_en: string;
  candidate_id: string;
  jobs: { titulo: string } | null;
  companies: { nombre: string; logo_url: string | null } | null;
  profiles: { nombre: string; foto_url: string | null } | null;
};

const hora = new Intl.DateTimeFormat("es-PA", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

async function Lista() {
  const { supabase, uid, perfil } = await requerirApp();
  const { data } = await supabase
    .from("matches")
    .select("id, creado_en, candidate_id, jobs(titulo), companies(nombre, logo_url), profiles!matches_candidate_id_fkey(nombre, foto_url)")
    .order("creado_en", { ascending: false });
  const matches = (data ?? []) as unknown as FilaMatch[];

  if (!matches.length) {
    return perfil.rol === "candidato" ? (
      <Vacio emoji="💘" titulo="Todavía no hay matches" texto="Cuando una empresa te elija, aparecerá aquí y podrán chatear." />
    ) : (
      <Vacio emoji="💘" titulo="Todavía no hay matches" texto="Desliza a la derecha a los postulantes que te interesen." />
    );
  }

  // Último mensaje y no leídos por match
  const { data: mensajes } = await supabase
    .from("messages")
    .select("match_id, sender_id, cuerpo, creado_en, leido_en")
    .in("match_id", matches.map((m) => m.id))
    .order("creado_en", { ascending: false })
    .limit(500);
  const ultimo = new Map<string, { cuerpo: string; creado_en: string; mio: boolean }>();
  const sinLeer = new Map<string, number>();
  for (const m of mensajes ?? []) {
    if (!ultimo.has(m.match_id)) ultimo.set(m.match_id, { cuerpo: m.cuerpo, creado_en: m.creado_en, mio: m.sender_id === uid });
    if (m.sender_id !== uid && !m.leido_en) sinLeer.set(m.match_id, (sinLeer.get(m.match_id) ?? 0) + 1);
  }

  return (
    <ul className="space-y-2 px-4 pb-6">
      {matches.map((m) => {
        const esCandidato = perfil.rol === "candidato";
        const nombre = esCandidato ? m.companies?.nombre : m.profiles?.nombre;
        const imagen = esCandidato ? m.companies?.logo_url : m.profiles?.foto_url;
        const u = ultimo.get(m.id);
        const n = sinLeer.get(m.id) ?? 0;
        return (
          <li key={m.id}>
            <Link href={`/chat/${m.id}`} className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-black/5 transition-transform duration-150 active:scale-[0.98]">
              <Avatar src={imagen} nombre={nombre} cuadrado={esCandidato} className="size-14" />
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-semibold">{nombre}</span>
                  <span className="shrink-0 text-xs text-zinc-400">{hora.format(new Date(u?.creado_en ?? m.creado_en))}</span>
                </p>
                <p className="truncate text-xs font-medium text-rose-600">{m.jobs?.titulo}</p>
                <p className={`truncate text-sm ${n ? "font-semibold text-zinc-900" : "text-zinc-500"}`}>
                  {u ? `${u.mio ? "Tú: " : ""}${u.cuerpo}` : "¡Nuevo match! Saluda 👋"}
                </p>
              </div>
              {n > 0 && (
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-rose-600 text-xs font-bold text-white">{n}</span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function Matches() {
  return (
    <>
      <Titulo>Matches</Titulo>
      <Suspense fallback={<Cargando />}>
        <Lista />
      </Suspense>
    </>
  );
}
