export function Titulo({ children, accion }: { children: React.ReactNode; accion?: React.ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
      <h1 className="text-2xl font-black">{children}</h1>
      {accion}
    </header>
  );
}

export function Cargando() {
  return (
    <div className="space-y-3 p-5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-zinc-200" />
      ))}
    </div>
  );
}

export function Vacio({ emoji, titulo, texto, children }: { emoji: string; titulo: string; texto?: string; children?: React.ReactNode }) {
  return (
    <div className="px-6 py-16 text-center">
      <p className="text-5xl">{emoji}</p>
      <p className="mt-3 text-lg font-semibold">{titulo}</p>
      {texto && <p className="mt-1 text-sm text-zinc-500">{texto}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
