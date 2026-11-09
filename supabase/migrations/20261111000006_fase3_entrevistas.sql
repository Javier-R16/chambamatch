-- =====================================================================
-- ChambaMatch · 0006 · Fase 3: entrevista con IA
-- Las escrituras en interviews se hacen SOLO desde el servidor (service role),
-- así el candidato no puede alterar su transcripción ni su puntaje.
-- =====================================================================

alter table public.interviews
  add column titulo_practica text,                         -- puesto libre en modo práctica
  add column iniciada_por uuid references public.profiles on delete set null,
  add column aceptada_en timestamptz,
  add column evaluacion jsonb;                             -- { fortalezas: [], mejoras: [] }

create index interviews_candidate_idx on public.interviews (candidate_id, creado_en desc);
create index interviews_match_idx on public.interviews (match_id, creado_en desc);

-- Una sola entrevista "viva" por match
create unique index interviews_una_activa_por_match on public.interviews (match_id)
  where estado in ('llamando', 'en_curso');

-- Preguntas generadas por Gemini: privadas (sin políticas ni permisos para el cliente).
-- Se sirven una a una desde la API para que no se puedan "preparar" de antemano.
create table public.interview_preguntas (
  interview_id uuid primary key references public.interviews on delete cascade,
  preguntas    jsonb not null default '[]'
);
alter table public.interview_preguntas enable row level security;
revoke all on public.interview_preguntas from anon, authenticated;

-- Llamada entrante en tiempo real (respeta la política "interviews: ver")
alter publication supabase_realtime add table public.interviews;
