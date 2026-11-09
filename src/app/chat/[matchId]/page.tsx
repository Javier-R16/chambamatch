import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requerirApp } from "@/lib/sesion";
import type { Mensaje } from "@/lib/tipos";
import { Chat } from "./chat";

export const metadata: Metadata = { title: "Chat" };

type DatosMatch = {
  id: string;
  candidate_id: string;
  jobs: { titulo: string } | null;
  companies: { nombre: string; logo_url: string | null; owner_id: string } | null;
  profiles: { nombre: string; foto_url: string | null } | null;
};

async function Contenido({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const { supabase, uid, perfil } = await requerirApp();

  // RLS: si no soy participante, no hay fila.
  const { data } = await supabase
    .from("matches")
    .select("id, candidate_id, jobs(titulo), companies(nombre, logo_url, owner_id), profiles!matches_candidate_id_fkey(nombre, foto_url)")
    .eq("id", matchId)
    .maybeSingle();
  const match = data as unknown as DatosMatch | null;
  if (!match || !match.companies) notFound();

  const soyCandidato = perfil.rol === "candidato";
  const otroId = soyCandidato ? match.companies.owner_id : match.candidate_id;

  const [{ data: contacto }, { data: mensajes }, cv, { data: yoBloquee }, { data: hayBloqueo }] = await Promise.all([
    // Visible solo porque hay match (RLS)
    supabase.from("contactos_privados").select("email, telefono").eq("user_id", otroId).maybeSingle(),
    supabase.from("messages").select("*").eq("match_id", matchId).order("creado_en", { ascending: true }).limit(300),
    soyCandidato
      ? Promise.resolve(null)
      : supabase
          .from("candidate_profiles")
          .select("cv_url")
          .eq("user_id", match.candidate_id)
          .maybeSingle()
          .then(async ({ data: c }) =>
            c?.cv_url ? (await supabase.storage.from("cvs").createSignedUrl(c.cv_url, 60 * 30)).data?.signedUrl ?? null : null,
          ),
    supabase.from("blocks").select("blocked_id").eq("blocker_id", uid).eq("blocked_id", otroId).maybeSingle(),
    supabase.rpc("match_bloqueado", { p_match: matchId }),
  ]);

  return (
    <Chat
      uid={uid}
      matchId={matchId}
      titulo={match.jobs?.titulo ?? ""}
      bloqueo={{ yo: !!yoBloquee, otro: !yoBloquee && !!hayBloqueo }}
      otro={{
        id: otroId,
        nombre: (soyCandidato ? match.companies.nombre : match.profiles?.nombre) ?? "",
        imagen: soyCandidato ? match.companies.logo_url : (match.profiles?.foto_url ?? null),
        esEmpresa: soyCandidato,
        email: contacto?.email ?? null,
        telefono: contacto?.telefono ?? null,
        cvUrl: cv,
      }}
      iniciales={(mensajes ?? []) as Mensaje[]}
    />
  );
}

export default function PaginaChat({ params }: PageProps<"/chat/[matchId]">) {
  return (
    <div className="mx-auto h-dvh max-w-md bg-zinc-50">
      <Suspense fallback={<p className="p-8 text-center text-zinc-500">Abriendo chat…</p>}>
        <Contenido params={params} />
      </Suspense>
    </div>
  );
}
