"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";

export type DatosMatch = { matchId: string; titulo: string; con: string; imagen?: string | null };

const EVENTO = "chamba:match";

/** Muestra la animación "¡Hay chamba!" desde cualquier parte de la app. */
export function anunciarMatch(datos: DatosMatch) {
  window.dispatchEvent(new CustomEvent<DatosMatch>(EVENTO, { detail: datos }));
}

const EMOJIS = ["💼", "🦐", "🎉", "✨", "🇵🇦", "💪"];

export function CapaMatch() {
  const [match, setMatch] = useState<DatosMatch | null>(null);
  const reducido = useReducedMotion();

  useEffect(() => {
    const alMatch = (e: Event) => {
      setMatch((e as CustomEvent<DatosMatch>).detail);
      navigator.vibrate?.([30, 60, 30]);
    };
    window.addEventListener(EVENTO, alMatch);
    return () => window.removeEventListener(EVENTO, alMatch);
  }, []);

  return (
    <AnimatePresence>
      {match && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="¡Hay chamba!"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-orange-500 via-rose-500 to-fuchsia-600 px-6 text-center text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {!reducido &&
            EMOJIS.map((e, i) => (
              <motion.span
                key={i}
                aria-hidden
                className="pointer-events-none absolute text-4xl"
                style={{ left: `${10 + i * 15}%`, bottom: -40 }}
                initial={{ y: 0, opacity: 0 }}
                animate={{ y: -520 - (i % 3) * 80, opacity: [0, 1, 1, 0] }}
                transition={{ duration: 1.8, delay: 0.1 + i * 0.08, ease: "easeOut" }}
              >
                {e}
              </motion.span>
            ))}

          <motion.h2
            className="text-6xl font-black italic drop-shadow-lg"
            initial={reducido ? { opacity: 0 } : { scale: 0.5, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: -4 }}
            transition={{ type: "spring", stiffness: 380, damping: 16, delay: 0.05 }}
          >
            ¡Hay chamba!
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.25, ease: "easeOut" }}
            className="mt-6 space-y-2"
          >
            <p className="text-lg">
              Tú y <b>{match.con}</b> hicieron match
            </p>
            <p className="text-white/85">para «{match.titulo}»</p>
          </motion.div>

          <motion.div
            className="mt-10 flex w-full max-w-xs flex-col gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.25, ease: "easeOut" }}
          >
            <Link
              href={`/chat/${match.matchId}`}
              onClick={() => setMatch(null)}
              className="rounded-full bg-white py-3 font-bold text-rose-600 shadow-lg transition-transform active:scale-95"
            >
              Escribir ahora
            </Link>
            <button
              type="button"
              onClick={() => setMatch(null)}
              className="rounded-full border-2 border-white/70 py-3 font-semibold transition-transform active:scale-95"
            >
              Seguir deslizando
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
