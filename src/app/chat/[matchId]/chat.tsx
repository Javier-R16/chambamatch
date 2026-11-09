"use client";

import { ChevronLeft, FileText, Mail, Phone, SendHorizontal } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/avatar";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { notificar } from "@/lib/notificar";
import { BotonEntrevista } from "@/components/entrevista/boton-entrevista";
import { AccionesChat } from "./acciones-chat";
import type { Mensaje } from "@/lib/tipos";

type Otro = {
  id: string;
  nombre: string;
  imagen: string | null;
  esEmpresa: boolean;
  email: string | null;
  telefono: string | null;
  cvUrl: string | null;
};

type Props = {
  uid: string;
  matchId: string;
  titulo: string;
  otro: Otro;
  iniciales: Mensaje[];
  /** yo: yo bloqueé al otro · otro: el otro me bloqueó (no se le dice explícitamente) */
  bloqueo: { yo: boolean; otro: boolean };
};

const hora = new Intl.DateTimeFormat("es-PA", { hour: "numeric", minute: "2-digit" });
const dia = new Intl.DateTimeFormat("es-PA", { weekday: "long", day: "numeric", month: "long" });

export function Chat({ uid, matchId, titulo, otro, iniciales, bloqueo }: Props) {
  const supabase = crearClienteNavegador();
  const [mensajes, setMensajes] = useState<Mensaje[]>(iniciales);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [yoBloquee, setYoBloquee] = useState(bloqueo.yo);
  const bloqueado = yoBloquee || bloqueo.otro;
  const fondo = useRef<HTMLDivElement>(null);

  // Tiempo real: nuevos mensajes y confirmaciones de lectura
  useEffect(() => {
    supabase.rpc("marcar_leidos", { p_match: matchId });
    const canal = supabase
      .channel(`chat-${matchId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` }, (p) => {
        const m = p.new as Mensaje;
        setMensajes((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        if (m.sender_id !== uid) supabase.rpc("marcar_leidos", { p_match: matchId });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` }, (p) => {
        const m = p.new as Mensaje;
        setMensajes((prev) => prev.map((x) => (x.id === m.id ? { ...x, leido_en: m.leido_en } : x)));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [supabase, matchId, uid]);

  useEffect(() => {
    fondo.current?.scrollIntoView({ block: "end" });
  }, [mensajes.length]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const cuerpo = texto.trim();
    if (!cuerpo || enviando) return;
    setEnviando(true);
    setTexto("");
    const { data, error } = await supabase
      .from("messages")
      .insert({ match_id: matchId, sender_id: uid, cuerpo })
      .select()
      .single<Mensaje>();
    setEnviando(false);
    if (error) {
      setTexto(cuerpo);
      return void toast.error("No se pudo enviar el mensaje.");
    }
    setMensajes((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data]));
    notificar("mensaje", data.id);
  }

  const ultimoMio = [...mensajes].reverse().find((m) => m.sender_id === uid);

  return (
    <div className="flex h-dvh flex-col">
      <header className="pt-seguro border-b border-zinc-200 bg-white">
        <div className="flex items-center gap-2 px-2 py-2">
          <Link href="/matches" aria-label="Volver" className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-zinc-100">
            <ChevronLeft className="size-6" />
          </Link>
          <Avatar src={otro.imagen} nombre={otro.nombre} cuadrado={otro.esEmpresa} className="size-10 text-sm" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{otro.nombre}</p>
            <p className="truncate text-xs text-rose-600">{titulo}</p>
          </div>
          <AccionesChat
            uid={uid}
            otroId={otro.id}
            otroNombre={otro.nombre}
            matchId={matchId}
            yoBloquee={yoBloquee}
            onCambioBloqueo={setYoBloquee}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto px-3 pb-2 text-xs">
          {!otro.esEmpresa && !bloqueado && <BotonEntrevista matchId={matchId} />}
          {otro.telefono && (
            <a href={`tel:${otro.telefono.replace(/[^\d+]/g, "")}`} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-zinc-100 px-3 py-1.5 font-medium">
              <Phone className="size-3.5" /> {otro.telefono}
            </a>
          )}
          {otro.email && (
            <a href={`mailto:${otro.email}`} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-zinc-100 px-3 py-1.5 font-medium">
              <Mail className="size-3.5" /> {otro.email}
            </a>
          )}
          {otro.cvUrl && (
            <a href={otro.cvUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-3 py-1.5 font-medium text-rose-700">
              <FileText className="size-3.5" /> Ver CV
            </a>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {mensajes.length === 0 && (
          <div className="py-10 text-center text-zinc-500">
            <p className="text-4xl">👋</p>
            <p className="mt-2">¡Hicieron match! Rompe el hielo.</p>
          </div>
        )}
        <ul className="space-y-1.5">
          {mensajes.map((m, i) => {
            const mio = m.sender_id === uid;
            const nuevoDia = i === 0 || new Date(m.creado_en).toDateString() !== new Date(mensajes[i - 1].creado_en).toDateString();
            return (
              <li key={m.id}>
                {nuevoDia && <p className="my-3 text-center text-xs font-medium text-zinc-400 first-letter:uppercase">{dia.format(new Date(m.creado_en))}</p>}
                <div className={`flex ${mio ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[15px] ${
                      mio ? "rounded-br-md bg-rose-600 text-white" : "rounded-bl-md bg-white text-zinc-900 ring-1 ring-black/5"
                    }`}
                  >
                    {m.cuerpo}
                    <span className={`ml-2 align-bottom text-[10px] ${mio ? "text-white/70" : "text-zinc-400"}`}>{hora.format(new Date(m.creado_en))}</span>
                  </div>
                </div>
                {mio && m.id === ultimoMio?.id && m.leido_en && <p className="mt-0.5 text-right text-[11px] text-zinc-400">Visto</p>}
              </li>
            );
          })}
        </ul>
        <div ref={fondo} />
      </div>

      {bloqueado ? (
        <p className="pb-seguro border-t border-zinc-200 bg-white px-4 pt-3 text-center text-sm text-zinc-500">
          {yoBloquee ? `Bloqueaste a ${otro.nombre}. Desbloquea desde el menú ⋮ para escribir.` : "No es posible enviar mensajes en este chat."}
        </p>
      ) : (
      <form onSubmit={enviar} className="pb-seguro flex items-end gap-2 border-t border-zinc-200 bg-white px-3 pt-2">
        <label htmlFor="mensaje" className="sr-only">
          Mensaje
        </label>
        <textarea
          id="mensaje"
          rows={1}
          maxLength={2000}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Escribe un mensaje…"
          className="field-sizing-content max-h-32 min-h-11 flex-1 resize-none rounded-2xl bg-zinc-100 px-4 py-2.5 text-base outline-none focus:ring-2 focus:ring-rose-300"
        />
        <button
          type="submit"
          aria-label="Enviar"
          disabled={!texto.trim() || enviando}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-rose-600 text-white transition-transform duration-150 active:scale-90 disabled:opacity-40"
        >
          <SendHorizontal className="size-5" />
        </button>
      </form>
      )}
    </div>
  );
}
