import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cargando, Titulo } from "@/components/titulo";
import { requerirApp } from "@/lib/sesion";
import { color } from "@/app/entrevista/[id]/resultado";
import { FormPractica } from "./form-practica";

export const metadata: Metadata = { title: "Practicar entrevista" };

const fecha = new Intl.DateTimeFormat("es-PA", { day: "numeric", month: "short" });

async function Contenido() {
  const { supabase, uid } = await requerirApp("candidato");
  const [{ data: postulaciones }, { data: consentimiento }, { data: historial }, { data: perfil }] = await Promise.all([
    supabase.from("mis_postulaciones").select("job_id, titulo, empresa").order("creado_en", { ascending: false }).limit(20),
    supabase.from("consentimientos").select("id").eq("user_id", uid).eq("tipo", "entrevista_ia").is("revocado_en", null).limit(1).maybeSingle(),
    supabase
      .from("interviews")
      .select("id, estado, puntaje, creado_en, titulo_practica, jobs(titulo)")
      .eq("candidate_id", uid)
      .eq("modo", "practica")
      .order("creado_en", { ascending: false })
      .limit(10),
    supabase.from("candidate_profiles").select("titulo").eq("user_id", uid).maybeSingle(),
  ]);

  return (
    <div className="space-y-8 px-5 pb-10">
      <p className="text-zinc-600">
        Ensaya con Chamba, nuestra entrevistadora con IA. Te hará 5 preguntas en voz alta y al final te dará un puntaje y
        consejos. Solo tú ves el resultado.
      </p>
      <FormPractica
        vacantes={(postulaciones ?? []).map((p) => ({ id: p.job_id, etiqueta: `${p.titulo} · ${p.empresa}` }))}
        puestoSugerido={perfil?.titulo ?? ""}
        necesitaConsentimiento={!consentimiento}
      />
      {historial && historial.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">Tus prácticas</h2>
          <ul className="space-y-2">
            {historial.map((h) => {
              const titulo = (h.jobs as unknown as { titulo: string } | null)?.titulo ?? h.titulo_practica ?? "Práctica";
              return (
                <li key={h.id}>
                  <Link href={`/entrevista/${h.id}`} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 ring-1 ring-black/5">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{titulo}</span>
                      <span className="text-xs text-zinc-500">{fecha.format(new Date(h.creado_en))}</span>
                    </span>
                    {h.puntaje !== null ? (
                      <span className={`text-xl font-black ${color(h.puntaje)}`}>{h.puntaje}</span>
                    ) : (
                      <span className="text-xs text-zinc-400">{h.estado === "en_curso" ? "Continuar →" : "Sin evaluar"}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function Practica() {
  return (
    <>
      <Titulo>🎙️ Practicar entrevista</Titulo>
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </>
  );
}
