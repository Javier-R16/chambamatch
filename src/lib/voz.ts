"use client";

// Voz con la Web Speech API del navegador (gratis en Chrome/Android).
// SpeechRecognition no está en los tipos de TS: declaramos lo mínimo.

type ResultadoReconocimiento = { isFinal: boolean; 0: { transcript: string } };
type EventoReconocimiento = { resultIndex: number; results: ArrayLike<ResultadoReconocimiento> };
type Reconocedor = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: EventoReconocimiento) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function constructorReconocedor(): (new () => Reconocedor) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Reconocedor; webkitSpeechRecognition?: new () => Reconocedor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const soportaDictado = () => constructorReconocedor() !== null;
export const soportaVoz = () => typeof window !== "undefined" && "speechSynthesis" in window;

function vozEspanol(): SpeechSynthesisVoice | undefined {
  const voces = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("es"));
  const preferidas = ["es-pa", "es-419", "es-us", "es-mx", "es-co", "es-es"];
  for (const p of preferidas) {
    const v = voces.find((x) => x.lang.toLowerCase() === p);
    if (v) return v;
  }
  return voces[0];
}

/** Lee el texto en voz alta. Resuelve al terminar (o de inmediato si no hay voz). */
export function hablar(texto: string): Promise<void> {
  if (!soportaVoz()) return Promise.resolve();
  return new Promise((resolve) => {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "es-PA";
    const v = vozEspanol();
    if (v) u.voice = v;
    u.rate = 1;
    // Chrome Android a veces no dispara onend: tiempo máximo según el largo
    const limite = setTimeout(resolve, 2000 + texto.length * 90);
    u.onend = u.onerror = () => {
      clearTimeout(limite);
      resolve();
    };
    speechSynthesis.speak(u);
  });
}

export const callar = () => soportaVoz() && speechSynthesis.cancel();

/**
 * Dictado: va entregando el texto reconocido. En Android el modo continuo es
 * inestable, así que reiniciamos solos cuando el motor se detiene.
 */
export function crearDictado(alTexto: (final: string, parcial: string) => void, alError: (e: string) => void) {
  const C = constructorReconocedor();
  if (!C) return null;
  let activo = false;
  let final = "";
  let idioma = "es-PA";
  let rec: Reconocedor | null = null;

  const arrancar = () => {
    rec = new C();
    rec.lang = idioma;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let parcial = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final = `${final} ${r[0].transcript}`.trim();
        else parcial += r[0].transcript;
      }
      alTexto(final, parcial);
    };
    rec.onerror = (e) => {
      if (e.error === "language-not-supported" && idioma !== "es-US") {
        idioma = "es-US";
        return;
      }
      if (e.error === "no-speech" || e.error === "aborted") return;
      activo = false;
      alError(e.error === "not-allowed" ? "Permite el micrófono para responder con tu voz." : "El micrófono falló. Puedes escribir tu respuesta.");
    };
    rec.onend = () => {
      if (activo) setTimeout(() => activo && arrancar(), 150);
    };
    rec.start();
  };

  return {
    iniciar(textoPrevio = "") {
      final = textoPrevio;
      activo = true;
      arrancar();
    },
    detener() {
      activo = false;
      rec?.stop();
    },
    get activo() {
      return activo;
    },
  };
}
