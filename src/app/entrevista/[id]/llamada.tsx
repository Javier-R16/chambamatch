"use client";

import { Mic, MicOff, PhoneOff, RotateCcw, Send } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/avatar";
import { callar, crearDictado, hablar, soportaDictado } from "@/lib/voz";
import { Resultado, type DatosResultado } from "./resultado";

type Props = {
  id: string;
  empresa: string;
  logo: string | null;
  puesto: string;
  modo: "empresa" | "practica";
};

type Fase = "inicio" | "conectando" | "hablando" | "escuchando" | "pensando" | "fin";

type RespuestaTurno = {
  saludo?: string;
  pregunta?: string;
  numero?: number;
  total?: number;
  fin?: boolean;
  despedida?: string;
  resultado?: DatosResultado;
  error?: string;
};

async function api(ruta: string, cuerpo: object): Promise<RespuestaTurno> {
  const r = await fetch(`/api/entrevista/${ruta}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  const datos = (await r.json().catch(() => ({}))) as RespuestaTurno;
  if (!r.ok) throw new Error(datos.error ?? "Error de conexión");
  return datos;
}

export function Llamada({ id, empresa, logo, puesto, modo }: Props) {
  const [fase, setFase] = useState<Fase>("inicio");
  const [pregunta, setPregunta] = useState("");
  const [progreso, setProgreso] = useState({ numero: 0, total: 5 });
  const [respuesta, setRespuesta] = useState("");
  const [parcial, setParcial] = useState("");
  const [microfono, setMicrofono] = useState(false);
  const [resultado, setResultado] = useState<DatosResultado | null>(null);
  const [segundos, setSegundos] = useState(0);
  const dictado = useRef<ReturnType<typeof crearDictado>>(null);
  const conDictado = useRef(false);

  // Cronómetro de la llamada
  useEffect(() => {
    if (fase === "inicio" || fase === "fin") return;
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [fase]);

  // Al salir de la pantalla: callar y soltar el micrófono
  useEffect(
    () => () => {
      callar();
      dictado.current?.detener();
    },
    [],
  );

  function escuchar(textoPrevio = "") {
    setFase("escuchando");
    if (!conDictado.current) return;
    if (!dictado.current) {
      dictado.current = crearDictado(
        (final, parcialTxt) => {
          setRespuesta(final);
          setParcial(parcialTxt);
        },
        (msg) => {
          setMicrofono(false);
          toast.error(msg);
        },
      );
    }
    dictado.current?.iniciar(textoPrevio);
    setMicrofono(true);
  }

  function pararMicrofono() {
    dictado.current?.detener();
    setMicrofono(false);
    setParcial("");
  }

  async function procesar(r: RespuestaTurno) {
    if (r.fin) {
      pararMicrofono();
      setFase("fin");
      setResultado(r.resultado ?? null);
      if (r.despedida) await hablar(r.despedida);
      return;
    }
    setPregunta(r.pregunta ?? "");
    setProgreso({ numero: r.numero ?? 1, total: r.total ?? 5 });
    setRespuesta("");
    setParcial("");
    setFase("hablando");
    if (r.saludo) await hablar(r.saludo);
    await hablar(r.pregunta ?? "");
    escuchar();
  }

  async function empezar() {
    // El primer toque desbloquea el audio del navegador (necesario en Android)
    conDictado.current = soportaDictado();
    setFase("conectando");
    try {
      await procesar(await api("turno", { id }));
    } catch (e) {
      setFase("inicio");
      toast.error(e instanceof Error ? e.message : "No se pudo conectar");
    }
  }

  async function enviar() {
    const texto = `${respuesta} ${parcial}`.trim();
    if (!texto) return void toast("Responde primero (con tu voz o escribiendo).");
    pararMicrofono();
    callar();
    setFase("pensando");
    try {
      await procesar(await api("turno", { id, respuesta: texto }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo enviar");
      setFase("escuchando");
    }
  }

  async function colgar() {
    pararMicrofono();
    callar();
    setFase("pensando");
    try {
      const r = await api("colgar", { id });
      setResultado(r.resultado ?? null);
    } catch {}
    setFase("fin");
  }

  async function repetir() {
    pararMicrofono();
    setFase("hablando");
    await hablar(pregunta);
    escuchar(respuesta);
  }

  const reloj = `${String(Math.floor(segundos / 60)).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")}`;

  if (fase === "fin") {
    return (
      <div className="flex min-h-dvh flex-col bg-zinc-50 px-5 py-8">
        {resultado ? (
          <Resultado datos={resultado} titulo="Resultado de tu práctica" />
        ) : (
          <div className="my-auto text-center">
            <p className="text-5xl">🙌</p>
            <h1 className="mt-4 text-2xl font-black">¡Entrevista terminada!</h1>
            <p className="mt-2 text-zinc-600">
              {modo === "empresa"
                ? `${empresa} recibirá tus respuestas. Si te quieren contactar, te escribirán por el chat.`
                : "Gracias por practicar."}
            </p>
          </div>
        )}
        <Link
          href={modo === "empresa" ? "/matches" : "/practica"}
          className="mt-8 block rounded-full bg-rose-600 py-3 text-center font-bold text-white"
        >
          {modo === "empresa" ? "Volver a mis matches" : "Volver a practicar"}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-zinc-900 via-zinc-900 to-rose-950 px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] text-white">
      <div className="text-center">
        <div className="relative mx-auto w-fit">
          {(fase === "hablando" || fase === "conectando" || fase === "pensando") && (
            <span className="absolute inset-0 animate-ping rounded-2xl bg-rose-500/40 motion-reduce:animate-none" />
          )}
          <Avatar src={logo} nombre={empresa} cuadrado className="relative size-24 text-3xl" />
        </div>
        <p className="mt-4 text-xl font-bold">{empresa}</p>
        <p className="text-sm text-white/70">
          {modo === "practica" ? "Práctica" : "Entrevista"} · {puesto}
        </p>
        <p className="mt-1 font-mono text-sm text-white/60">
          {fase === "inicio" ? "Lista para empezar" : fase === "conectando" ? "Conectando…" : reloj}
        </p>
      </div>

      {fase === "inicio" ? (
        <div className="mt-auto space-y-4 text-center">
          <p className="text-white/80">
            Te haremos 5 preguntas en voz alta. Responde hablando
            {soportaDictado() ? "" : " o escribiendo (tu navegador no permite dictado)"}. Busca un lugar tranquilo.
          </p>
          <button
            type="button"
            onClick={empezar}
            className="w-full rounded-full bg-emerald-500 py-4 text-lg font-bold shadow-lg transition-transform duration-150 active:scale-95"
          >
            Empezar entrevista
          </button>
          <button type="button" onClick={colgar} className="text-sm text-white/60 underline">
            Ahora no
          </button>
        </div>
      ) : (
        <>
          <div className="mt-8 flex-1">
            {pregunta && (
              <div className="rounded-3xl bg-white/10 p-5 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-300">
                  Pregunta {progreso.numero} de {progreso.total}
                </p>
                <p className="mt-2 text-lg leading-snug">{pregunta}</p>
                <button type="button" onClick={repetir} disabled={fase !== "escuchando"} className="mt-3 inline-flex items-center gap-1 text-sm text-white/70 disabled:opacity-40">
                  <RotateCcw className="size-4" /> Repetir
                </button>
              </div>
            )}

            {(fase === "escuchando" || fase === "pensando") && (
              <div className="mt-4">
                <label htmlFor="resp" className="text-xs font-semibold uppercase tracking-wide text-white/60">
                  Tu respuesta {microfono && <span className="text-emerald-400">· escuchando…</span>}
                </label>
                <textarea
                  id="resp"
                  rows={5}
                  value={parcial ? `${respuesta} ${parcial}`.trim() : respuesta}
                  onChange={(e) => {
                    setRespuesta(e.target.value);
                    setParcial("");
                  }}
                  disabled={fase === "pensando"}
                  placeholder={soportaDictado() ? "Habla y verás aquí tu respuesta. Puedes corregirla." : "Escribe tu respuesta"}
                  className="mt-1 w-full resize-none rounded-2xl bg-white/10 p-4 text-base text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
            )}
            {fase === "pensando" && <p className="mt-3 text-center text-white/70">Un momento…</p>}
          </div>

          <div className="mt-6 flex items-center justify-center gap-6">
            {soportaDictado() && (
              <button
                type="button"
                aria-label={microfono ? "Silenciar micrófono" : "Activar micrófono"}
                disabled={fase !== "escuchando"}
                onClick={() => (microfono ? pararMicrofono() : escuchar(respuesta))}
                className={`grid size-14 place-items-center rounded-full transition-transform duration-150 active:scale-90 disabled:opacity-40 ${microfono ? "bg-white text-zinc-900" : "bg-white/15"}`}
              >
                {microfono ? <Mic className="size-6" /> : <MicOff className="size-6" />}
              </button>
            )}
            <button
              type="button"
              aria-label="Colgar"
              onClick={colgar}
              className="grid size-16 place-items-center rounded-full bg-rose-600 shadow-lg transition-transform duration-150 active:scale-90"
            >
              <PhoneOff className="size-7" />
            </button>
            <button
              type="button"
              aria-label="Enviar respuesta"
              disabled={fase !== "escuchando"}
              onClick={enviar}
              className="grid size-14 place-items-center rounded-full bg-emerald-500 transition-transform duration-150 active:scale-90 disabled:opacity-40"
            >
              <Send className="size-6" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
