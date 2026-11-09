-- =====================================================================
-- ChambaMatch · 0001 · Tipos y tablas
-- =====================================================================

create type public.rol_usuario       as enum ('candidato', 'empresa');
create type public.modalidad_trabajo as enum ('presencial', 'remoto', 'hibrido');
create type public.direccion_swipe   as enum ('left', 'right', 'super');
create type public.tipo_contrato     as enum ('indefinido', 'temporal', 'por_obra', 'medio_tiempo', 'pasantia', 'freelance');
create type public.estado_entrevista as enum ('pendiente', 'llamando', 'en_curso', 'completada', 'rechazada', 'fallida');

-- Catálogo de provincias y comarcas de Panamá
create table public.provincias (
  nombre     text primary key,
  es_comarca boolean not null default false
);
insert into public.provincias (nombre, es_comarca) values
  ('Bocas del Toro', false), ('Coclé', false), ('Colón', false), ('Chiriquí', false),
  ('Darién', false), ('Herrera', false), ('Los Santos', false), ('Panamá', false),
  ('Panamá Oeste', false), ('Veraguas', false),
  ('Comarca Guna Yala', true), ('Comarca Emberá-Wounaan', true),
  ('Comarca Ngäbe-Buglé', true), ('Comarca Naso Tjër Di', true);

-- Perfil base (se crea automáticamente al registrarse)
create table public.profiles (
  id                  uuid primary key references auth.users on delete cascade,
  rol                 public.rol_usuario,            -- null hasta elegirlo en el onboarding
  nombre              text not null default '',
  foto_url            text,
  provincia           text references public.provincias,
  onboarding_completo boolean not null default false,
  creado_en           timestamptz not null default now()
);

-- Datos de contacto: visibles solo para el dueño y sus matches
create table public.contactos_privados (
  user_id  uuid primary key references public.profiles on delete cascade,
  email    text,
  telefono text check (telefono is null or telefono ~ '^\+?[0-9 -]{7,15}$')
);

create table public.candidate_profiles (
  user_id           uuid primary key references public.profiles on delete cascade,
  titulo            text not null,
  anios_experiencia smallint not null default 0 check (anios_experiencia between 0 and 60),
  habilidades       text[] not null default '{}',
  salario_esperado  numeric(10,2) check (salario_esperado >= 0),   -- B/. mensual
  modalidad         public.modalidad_trabajo,
  disponibilidad    text,
  bio               text check (char_length(bio) <= 1000),
  cv_url            text,            -- ruta dentro del bucket privado 'cvs', no URL pública
  actualizado_en    timestamptz not null default now()
);

create table public.companies (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null unique references public.profiles on delete cascade,
  nombre     text not null,
  logo_url   text,
  sector     text,
  provincia  text references public.provincias,
  verificada boolean not null default false,   -- solo la cambia un administrador
  creado_en  timestamptz not null default now()
);

create table public.jobs (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies on delete cascade,
  titulo          text not null,
  descripcion     text not null,
  salario_min     numeric(10,2) check (salario_min >= 0),   -- B/. mensual
  salario_max     numeric(10,2) check (salario_max >= 0),
  modalidad       public.modalidad_trabajo not null,
  provincia       text not null references public.provincias,
  ciudad          text,
  tipo_contrato   public.tipo_contrato not null default 'indefinido',
  habilidades     text[] not null default '{}',
  activa          boolean not null default true,
  destacada_hasta timestamptz,                                -- Fase 4 (pago)
  creado_en       timestamptz not null default now(),
  check (salario_min is null or salario_max is null or salario_min <= salario_max)
);
create index jobs_feed_idx    on public.jobs (activa, provincia, modalidad);
create index jobs_company_idx on public.jobs (company_id);

create table public.candidate_swipes (
  candidate_id uuid not null references public.profiles on delete cascade,
  job_id       uuid not null references public.jobs on delete cascade,
  direccion    public.direccion_swipe not null,
  creado_en    timestamptz not null default now(),
  primary key (candidate_id, job_id)
);
create index candidate_swipes_postulantes_idx on public.candidate_swipes (job_id) where direccion <> 'left';

create table public.company_swipes (
  job_id       uuid not null references public.jobs on delete cascade,
  candidate_id uuid not null references public.profiles on delete cascade,
  direccion    public.direccion_swipe not null check (direccion in ('left', 'right')),
  creado_en    timestamptz not null default now(),
  primary key (job_id, candidate_id)
);

create table public.matches (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid not null references public.jobs on delete cascade,
  candidate_id uuid not null references public.profiles on delete cascade,
  company_id   uuid not null references public.companies on delete cascade,
  creado_en    timestamptz not null default now(),
  unique (job_id, candidate_id)
);
create index matches_candidate_idx on public.matches (candidate_id);
create index matches_company_idx   on public.matches (company_id);

create table public.messages (
  id        uuid primary key default gen_random_uuid(),
  match_id  uuid not null references public.matches on delete cascade,
  sender_id uuid not null references public.profiles on delete cascade,
  cuerpo    text not null check (char_length(cuerpo) between 1 and 2000),
  creado_en timestamptz not null default now(),
  leido_en  timestamptz
);
create index messages_match_idx on public.messages (match_id, creado_en);

-- Ley 81 de 2019: registro de consentimientos explícitos
create table public.consentimientos (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles on delete cascade,
  tipo        text not null check (tipo in ('datos_personales', 'entrevista_ia')),
  version     text not null,
  aceptado_en timestamptz not null default now(),
  revocado_en timestamptz
);

create table public.reports (
  id          bigint generated always as identity primary key,
  reporter_id uuid not null references public.profiles on delete cascade,
  reported_id uuid not null references public.profiles on delete cascade,
  match_id    uuid references public.matches on delete set null,
  motivo      text not null check (motivo in ('spam', 'acoso', 'oferta_falsa', 'contenido_inapropiado', 'otro')),
  detalle     text check (char_length(detalle) <= 1000),
  estado      text not null default 'abierto' check (estado in ('abierto', 'revisado', 'cerrado')),
  creado_en   timestamptz not null default now(),
  check (reporter_id <> reported_id)
);

create table public.blocks (
  blocker_id uuid not null references public.profiles on delete cascade,
  blocked_id uuid not null references public.profiles on delete cascade,
  creado_en  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- Fase 3: entrevistas con IA (match_id es null en el modo práctica)
create table public.interviews (
  id            uuid primary key default gen_random_uuid(),
  match_id      uuid references public.matches on delete cascade,
  candidate_id  uuid not null references public.profiles on delete cascade,
  job_id        uuid references public.jobs on delete set null,
  modo          text not null default 'empresa' check (modo in ('empresa', 'practica')),
  transcripcion jsonb not null default '[]',
  puntaje       smallint check (puntaje between 0 and 100),
  resumen       text,
  estado        public.estado_entrevista not null default 'pendiente',
  creado_en     timestamptz not null default now(),
  finalizada_en timestamptz
);
