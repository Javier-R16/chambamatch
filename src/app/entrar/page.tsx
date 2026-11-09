import type { Metadata } from "next";
import { Suspense } from "react";
import { FormEntrar } from "./form-entrar";

export const metadata: Metadata = { title: "Entrar" };

export default function PaginaEntrar() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <h1 className="text-4xl font-black italic text-rose-600">ChambaMatch</h1>
      <p className="mt-2 text-zinc-600">Entra o crea tu cuenta para empezar a deslizar.</p>
      <Suspense>
        <FormEntrar />
      </Suspense>
    </main>
  );
}
