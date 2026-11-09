"use client";

import { animate, motion, useMotionValue, useTransform, type PanInfo } from "motion/react";
import { Check, Star, X } from "lucide-react";
import { useEffect, useImperativeHandle, useRef, type ReactNode, type Ref } from "react";
import type { Direccion } from "@/lib/tipos";

type ControlTarjeta = { lanzar: (dir: Direccion) => void };

type Etiquetas = { right: string; left: string; super?: string };

type PropsMazo<T> = {
  items: T[];
  clave: (item: T) => string;
  render: (item: T) => ReactNode;
  /** Se llama cuando la tarjeta ya salió de la pantalla. El padre la quita de `items`. */
  onSwipe: (item: T, dir: Direccion) => void;
  permitirSuper?: boolean;
  puedeSuper?: boolean;
  onSuperBloqueado?: () => void;
  etiquetas: Etiquetas;
  vacio: ReactNode;
};

const UMBRAL_X = 110;
const UMBRAL_Y = 120;
const VELOCIDAD = 600;

export function MazoSwipe<T>({
  items,
  clave,
  render,
  onSwipe,
  permitirSuper = false,
  puedeSuper = false,
  onSuperBloqueado,
  etiquetas,
  vacio,
}: PropsMazo<T>) {
  const tope = useRef<ControlTarjeta>(null);
  const visibles = items.slice(0, 2);

  // Flechas del teclado en escritorio
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") tope.current?.lanzar("right");
      if (e.key === "ArrowLeft") tope.current?.lanzar("left");
      if (e.key === "ArrowUp" && permitirSuper) tope.current?.lanzar("super");
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [permitirSuper]);

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex-1">
        {visibles.length === 0 ? (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">{vacio}</div>
        ) : (
          visibles
            .map((item, i) => (
              <Tarjeta
                key={clave(item)}
                ref={i === 0 ? tope : undefined}
                esTope={i === 0}
                permitirSuper={permitirSuper}
                puedeSuper={puedeSuper}
                onSuperBloqueado={onSuperBloqueado}
                etiquetas={etiquetas}
                onSalida={(dir) => onSwipe(item, dir)}
              >
                {render(item)}
              </Tarjeta>
            ))
            .reverse()
        )}
      </div>

      <div className="flex items-center justify-center gap-5 py-4">
        <BotonAccion
          etiqueta="Descartar"
          onClick={() => tope.current?.lanzar("left")}
          disabled={!visibles.length}
          className="size-16 text-rose-500"
        >
          <X className="size-8" strokeWidth={3} />
        </BotonAccion>
        {permitirSuper && (
          <BotonAccion
            etiqueta="Súper Chamba"
            onClick={() => (puedeSuper ? tope.current?.lanzar("super") : onSuperBloqueado?.())}
            disabled={!visibles.length}
            className={`size-12 ${puedeSuper ? "text-sky-500" : "text-zinc-300"}`}
          >
            <Star className="size-6" strokeWidth={2.5} fill="currentColor" />
          </BotonAccion>
        )}
        <BotonAccion
          etiqueta={etiquetas.right}
          onClick={() => tope.current?.lanzar("right")}
          disabled={!visibles.length}
          className="size-16 text-emerald-500"
        >
          <Check className="size-8" strokeWidth={3} />
        </BotonAccion>
      </div>
    </div>
  );
}

function BotonAccion({
  etiqueta,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { etiqueta: string }) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      className={`grid place-items-center rounded-full bg-white shadow-lg ring-1 ring-black/5 transition-transform duration-150 ease-out active:scale-90 disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

type PropsTarjeta = {
  ref?: Ref<ControlTarjeta>;
  esTope: boolean;
  permitirSuper: boolean;
  puedeSuper: boolean;
  onSuperBloqueado?: () => void;
  etiquetas: Etiquetas;
  onSalida: (dir: Direccion) => void;
  children: ReactNode;
};

function Tarjeta({ ref, esTope, permitirSuper, puedeSuper, onSuperBloqueado, etiquetas, onSalida, children }: PropsTarjeta) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-12, 0, 12]);
  const opDerecha = useTransform(x, [20, UMBRAL_X], [0, 1]);
  const opIzquierda = useTransform(x, [-UMBRAL_X, -20], [1, 0]);
  const opSuper = useTransform(y, [-UMBRAL_Y, -30], [1, 0]);
  const saliendo = useRef(false);

  const volver = () => {
    const resorte = { type: "spring", stiffness: 500, damping: 32 } as const;
    animate(x, 0, resorte);
    animate(y, 0, resorte);
  };

  const lanzar = async (dir: Direccion) => {
    if (saliendo.current) return;
    if (dir === "super" && !puedeSuper) {
      onSuperBloqueado?.();
      volver();
      return;
    }
    saliendo.current = true;
    navigator.vibrate?.(12);
    const salida = { type: "tween", duration: 0.26, ease: [0.4, 0, 1, 1] } as const;
    const ancho = typeof window !== "undefined" ? window.innerWidth : 500;
    if (dir === "super") await animate(y, -window.innerHeight, salida);
    else await animate(x, (dir === "right" ? 1 : -1) * ancho * 1.3, salida);
    onSalida(dir);
  };

  useImperativeHandle(ref, () => ({ lanzar }));

  const alSoltar = (_: unknown, { offset, velocity }: PanInfo) => {
    if (permitirSuper && (offset.y < -UMBRAL_Y || velocity.y < -VELOCIDAD) && Math.abs(offset.x) < UMBRAL_X) {
      return void lanzar("super");
    }
    if (offset.x > UMBRAL_X || velocity.x > VELOCIDAD) return void lanzar("right");
    if (offset.x < -UMBRAL_X || velocity.x < -VELOCIDAD) return void lanzar("left");
    volver();
  };

  return (
    <motion.div
      className="absolute inset-x-3 inset-y-1"
      initial={false}
      animate={{ scale: esTope ? 1 : 0.95, y: esTope ? 0 : 10 }}
      transition={{ type: "spring", stiffness: 400, damping: 34 }}
    >
      <motion.div
        className="relative h-full overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-black/5 will-change-transform select-none"
        style={{ x, y, rotate }}
        drag={esTope ? (permitirSuper ? true : "x") : false}
        dragMomentum={false}
        dragElastic={1}
        onDragEnd={alSoltar}
        whileTap={esTope ? { cursor: "grabbing" } : undefined}
      >
        {children}
        {esTope && (
          <>
            <Sello style={{ opacity: opDerecha }} className="left-5 -rotate-12 border-emerald-500 text-emerald-500">
              {etiquetas.right}
            </Sello>
            <Sello style={{ opacity: opIzquierda }} className="right-5 rotate-12 border-rose-500 text-rose-500">
              {etiquetas.left}
            </Sello>
            {permitirSuper && etiquetas.super && (
              <Sello
                style={{ opacity: opSuper }}
                className="bottom-28 left-1/2 top-auto -translate-x-1/2 border-sky-500 text-sky-500"
              >
                {etiquetas.super}
              </Sello>
            )}
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function Sello({ className, ...props }: React.ComponentProps<typeof motion.div>) {
  return (
    <motion.div
      aria-hidden
      className={`pointer-events-none absolute top-6 rounded-xl border-4 bg-white/80 px-3 py-1 text-2xl font-black uppercase tracking-wider ${className}`}
      {...props}
    />
  );
}
