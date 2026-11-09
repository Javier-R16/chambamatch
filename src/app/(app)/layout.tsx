import { Suspense } from "react";
import { CapaMatch } from "@/components/match/capa-match";
import { LlamadaEntrante } from "@/components/entrevista/llamada-entrante";
import { EscuchaMatches } from "@/components/match/escucha-matches";
import { BarraNavegacion } from "@/components/navegacion";
import { requerirApp } from "@/lib/sesion";

async function Navegacion() {
  const { uid, perfil } = await requerirApp();
  return (
    <>
      <BarraNavegacion rol={perfil.rol} uid={uid} />
      {perfil.rol === "candidato" && (
        <>
          <EscuchaMatches uid={uid} />
          <LlamadaEntrante uid={uid} />
        </>
      )}
    </>
  );
}

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col bg-zinc-50">
      <main className="pt-seguro min-h-0 flex-1 overflow-y-auto">{children}</main>
      <Suspense fallback={<div className="pb-seguro h-16 border-t border-zinc-200 bg-white" />}>
        <Navegacion />
      </Suspense>
      <CapaMatch />
    </div>
  );
}
