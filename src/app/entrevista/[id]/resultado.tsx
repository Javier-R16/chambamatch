export type DatosResultado = { puntaje: number; resumen: string; fortalezas: string[]; mejoras: string[] };

export function color(p: number) {
  return p >= 75 ? "text-emerald-600" : p >= 50 ? "text-amber-600" : "text-rose-600";
}

/** Tarjeta de resultado: la usan la práctica (candidato) y la empresa. */
export function Resultado({ datos, titulo }: { datos: DatosResultado; titulo: string }) {
  const p = datos.puntaje;
  const r = 52;
  const circ = 2 * Math.PI * r;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black">{titulo}</h1>
      <div className="flex items-center gap-5 rounded-3xl bg-white p-5 ring-1 ring-black/5">
        <svg viewBox="0 0 120 120" className="size-28 shrink-0 -rotate-90" role="img" aria-label={`Puntaje ${p} de 100`}>
          <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="12" className="text-zinc-100" />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - p / 100)}
            className={color(p)}
          />
          <text x="60" y="60" textAnchor="middle" dominantBaseline="central" transform="rotate(90 60 60)" className="fill-zinc-900 text-[28px] font-black">
            {p}
          </text>
        </svg>
        <p className="text-[15px] leading-relaxed text-zinc-700">{datos.resumen}</p>
      </div>
      {datos.fortalezas?.length > 0 && (
        <section className="rounded-3xl bg-white p-5 ring-1 ring-black/5">
          <h2 className="font-bold text-emerald-700">Fortalezas</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] text-zinc-700">
            {datos.fortalezas.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>
      )}
      {datos.mejoras?.length > 0 && (
        <section className="rounded-3xl bg-white p-5 ring-1 ring-black/5">
          <h2 className="font-bold text-amber-700">Para mejorar</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] text-zinc-700">
            {datos.mejoras.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>
      )}
      <p className="text-xs text-zinc-400">Evaluación generada por IA a partir de la transcripción. Úsala como apoyo, no como decisión final.</p>
    </div>
  );
}
