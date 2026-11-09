import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Landing() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-between bg-gradient-to-br from-orange-500 via-rose-500 to-fuchsia-600 px-6 py-12 text-white">
      <div>
        <p className="text-5xl">🦐💼</p>
        <h1 className="mt-6 text-5xl font-black italic leading-none">ChambaMatch</h1>
        <p className="mt-4 text-xl text-white/90">
          Desliza vacantes. Si la empresa también te elige, hay match y chatean al instante.
        </p>
      </div>

      <ul className="space-y-3 text-lg">
        <li>👉 Derecha: te postulas</li>
        <li>👈 Izquierda: pasas (nadie se entera)</li>
        <li>⭐ Arriba: Súper Chamba, te ven primero</li>
      </ul>

      <div className="space-y-3">
        <Link href="/entrar" className={buttonVariants({ className: "h-12 w-full bg-white text-lg font-bold text-rose-600 hover:bg-white/90" })}>
          Empezar
        </Link>
        <p className="text-center text-sm text-white/80">
          Gratis para candidatos ·{" "}
          <Link href="/privacidad" className="underline">
            Privacidad
          </Link>
        </p>
      </div>
    </main>
  );
}
