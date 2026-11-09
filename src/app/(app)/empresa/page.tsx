import type { Metadata } from "next";
import { Plus, Star, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Cargando, Titulo, Vacio } from "@/components/titulo";
import { buttonVariants } from "@/components/ui/button";
import { etiquetaModalidad, formatoSalario } from "@/lib/constantes";
import { requerirApp } from "@/lib/sesion";
import type { Vacante } from "@/lib/tipos";

export const metadata: Metadata = { title: "Mis vacantes" };

async function Panel() {
  const { supabase, uid } = await requerirApp("empresa");
  const { data: empresa } = await supabase.from("companies").select("id, nombre").eq("owner_id", uid).maybeSingle();
  if (!empresa) redirect("/onboarding");

  const { data } = await supabase.from("jobs").select("*").eq("company_id", empresa.id).order("creado_en", { ascending: false });
  const vacantes = (data ?? []) as Vacante[];
  const ids = vacantes.map((v) => v.id);

  // Postulantes pendientes por vacante = postulaciones (RLS ya excluye las 'left') − ya revisados
  const [{ data: post }, { data: revisados }] = await Promise.all([
    ids.length ? supabase.from("candidate_swipes").select("job_id, candidate_id").in("job_id", ids) : { data: [] },
    ids.length ? supabase.from("company_swipes").select("job_id, candidate_id").in("job_id", ids) : { data: [] },
  ]);
  const vistos = new Set((revisados ?? []).map((r) => `${r.job_id}:${r.candidate_id}`));
  const pendientes = new Map<string, number>();
  const totales = new Map<string, number>();
  for (const p of post ?? []) {
    totales.set(p.job_id, (totales.get(p.job_id) ?? 0) + 1);
    if (!vistos.has(`${p.job_id}:${p.candidate_id}`)) pendientes.set(p.job_id, (pendientes.get(p.job_id) ?? 0) + 1);
  }

  if (!vacantes.length) {
    return (
      <Vacio emoji="📣" titulo="Publica tu primera vacante" texto="Los candidatos la verán al instante en su feed.">
        <Link href="/empresa/vacantes/nueva" className={buttonVariants({ className: "font-bold" })}>
          Crear vacante
        </Link>
      </Vacio>
    );
  }

  return (
    <ul className="space-y-3 px-4 pb-6">
      {vacantes.map((v) => {
        const n = pendientes.get(v.id) ?? 0;
        return (
          <li key={v.id} className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-lg font-bold">{v.titulo}</p>
                <p className="text-sm text-zinc-500">
                  {v.ciudad ?? v.provincia} · {etiquetaModalidad(v.modalidad)} · {formatoSalario(v.salario_min, v.salario_max)}
                </p>
              </div>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${v.activa ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-500"}`}>
                  {v.activa ? "Activa" : "Cerrada"}
                </span>
                {v.destacada_hasta && new Date(v.destacada_hasta) > new Date() && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">⭐ Destacada</span>
                )}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <Link
                href={`/empresa/vacantes/${v.id}/postulantes`}
                className={buttonVariants({ className: "flex-1 font-semibold" })}
              >
                <Users className="size-4" />
                {n ? `${n} por revisar` : `Postulantes (${totales.get(v.id) ?? 0})`}
              </Link>
              <Link href={`/empresa/vacantes/${v.id}`} className={buttonVariants({ variant: "outline" })}>
                Editar
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function PanelEmpresa() {
  return (
    <>
      <Titulo
        accion={
          <div className="flex gap-2">
            <Link href="/empresa/planes" className={buttonVariants({ size: "sm", variant: "outline", className: "h-10 px-3 font-semibold" })}>
              <Star className="size-4 text-amber-500" fill="currentColor" /> Planes
            </Link>
            <Link href="/empresa/vacantes/nueva" className={buttonVariants({ size: "sm", className: "h-10 px-3 font-semibold" })}>
              <Plus className="size-4" /> Nueva
            </Link>
          </div>
        }
      >
        Mis vacantes
      </Titulo>
      <Suspense fallback={<Cargando />}>
        <Panel />
      </Suspense>
    </>
  );
}
