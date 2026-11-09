-- =====================================================================
-- ChambaMatch · 0007 · Fase 4: monetización (PREPARADA, APAGADA)
-- Candidatos: siempre gratis. Empresas: vacantes destacadas y paquetes.
-- Todo queda inactivo mientras config_app.pagos_activos = false.
-- =====================================================================

-- Configuración global (solo la cambia un administrador desde el panel de Supabase)
create table public.config_app (
  clave text primary key,
  valor jsonb not null
);
insert into public.config_app (clave, valor) values
  ('pagos_activos', 'false'),
  ('vacantes_activas_gratis', '3');   -- límite gratis por empresa cuando se activen los pagos
alter table public.config_app enable row level security;
revoke all on public.config_app from anon, authenticated;
grant select on public.config_app to authenticated;
create policy "config: lectura" on public.config_app for select to authenticated using (true);

create function public.pagos_activos() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select (valor)::text::boolean from public.config_app where clave = 'pagos_activos'), false)
$$;

-- Catálogo de planes (precios en centavos de USD = B/.)
create table public.planes (
  id               text primary key,
  nombre           text not null,
  descripcion      text not null,
  tipo             text not null check (tipo in ('destacada', 'paquete')),
  precio_centavos  int not null check (precio_centavos > 0),
  dias             int check (dias > 0),               -- destacada
  vacantes_extra   int check (vacantes_extra > 0),     -- paquete
  activo           boolean not null default true,
  orden            int not null default 0,
  check ((tipo = 'destacada' and dias is not null) or (tipo = 'paquete' and vacantes_extra is not null))
);
-- Precios provisionales: ajústalos antes de activar los pagos
insert into public.planes (id, nombre, descripcion, tipo, precio_centavos, dias, vacantes_extra, orden) values
  ('destacada_7',  'Destacada 7 días',  'Tu vacante sale primero en el feed de los candidatos durante 7 días.',  'destacada',  999,  7, null, 1),
  ('destacada_30', 'Destacada 30 días', 'Tu vacante sale primero en el feed de los candidatos durante 30 días.', 'destacada', 2499, 30, null, 2),
  ('paquete_5',    'Paquete 5 vacantes',  '5 vacantes activas adicionales, sin vencimiento.',  'paquete', 2999, null, 5, 3),
  ('paquete_15',   'Paquete 15 vacantes', '15 vacantes activas adicionales, sin vencimiento.', 'paquete', 6999, null, 15, 4);
alter table public.planes enable row level security;
revoke all on public.planes from anon, authenticated;
grant select on public.planes to authenticated;
create policy "planes: lectura" on public.planes for select to authenticated using (activo);

-- Cupo comprado por la empresa
alter table public.companies add column vacantes_extra int not null default 0;

-- Pagos: los crea y confirma SOLO el servidor (service role) tras el webhook del proveedor
create table public.pagos (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies on delete cascade,
  plan_id            text not null references public.planes,
  job_id             uuid references public.jobs on delete set null,
  monto_centavos     int not null,
  moneda             text not null default 'USD',
  proveedor          text not null,
  referencia_externa text unique,
  estado             text not null default 'pendiente' check (estado in ('pendiente', 'pagado', 'fallido', 'reembolsado')),
  creado_en          timestamptz not null default now(),
  pagado_en          timestamptz
);
create index pagos_company_idx on public.pagos (company_id, creado_en desc);
alter table public.pagos enable row level security;
revoke all on public.pagos from anon, authenticated;
grant select on public.pagos to authenticated;
create policy "pagos: ver los míos" on public.pagos for select to authenticated using (company_id = public.mi_company_id());

-- Aplica un pago confirmado (idempotente). Solo service role.
create function public.aplicar_pago(p_pago uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_pago public.pagos%rowtype;
  v_plan public.planes%rowtype;
begin
  update public.pagos set estado = 'pagado', pagado_en = now()
  where id = p_pago and estado = 'pendiente'
  returning * into v_pago;
  if not found then return; end if;   -- ya aplicado o inexistente

  select * into v_plan from public.planes where id = v_pago.plan_id;
  if v_plan.tipo = 'destacada' then
    update public.jobs
      set destacada_hasta = greatest(coalesce(destacada_hasta, now()), now()) + make_interval(days => v_plan.dias)
      where id = v_pago.job_id and company_id = v_pago.company_id;
  else
    update public.companies set vacantes_extra = vacantes_extra + v_plan.vacantes_extra where id = v_pago.company_id;
  end if;
end $$;
revoke execute on function public.aplicar_pago(uuid) from public, anon, authenticated;

-- Límite de vacantes activas (solo cuando los pagos estén activos)
create function public.validar_limite_vacantes() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_limite int;
  v_activas int;
begin
  if not new.activa or not public.pagos_activos() then return new; end if;
  if tg_op = 'UPDATE' and old.activa then return new; end if;

  select coalesce((select (valor)::text::int from public.config_app where clave = 'vacantes_activas_gratis'), 3)
         + c.vacantes_extra
    into v_limite
  from public.companies c where c.id = new.company_id;

  select count(*) into v_activas from public.jobs
  where company_id = new.company_id and activa and id <> new.id;

  if v_activas >= v_limite then
    raise exception 'Alcanzaste tu límite de % vacantes activas. Cierra una o compra un paquete.', v_limite
      using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger antes_vacante_limite before insert or update of activa on public.jobs
  for each row execute function public.validar_limite_vacantes();

-- Feed: ahora indica si la vacante es destacada (patrocinada), para mostrarlo con transparencia
drop function public.feed_candidato(text[], public.modalidad_trabajo[], numeric, int);
create function public.feed_candidato(
  p_provincias  text[] default null,
  p_modalidades public.modalidad_trabajo[] default null,
  p_salario_min numeric default null,
  p_limite      int default 20)
returns table (
  id uuid, titulo text, descripcion text, salario_min numeric, salario_max numeric,
  modalidad public.modalidad_trabajo, provincia text, ciudad text, tipo_contrato public.tipo_contrato,
  habilidades text[], creado_en timestamptz,
  empresa_nombre text, empresa_logo text, empresa_sector text, empresa_verificada boolean,
  coincidencias int, destacada boolean)
language sql stable security invoker set search_path = '' as $$
  select j.id, j.titulo, j.descripcion, j.salario_min, j.salario_max, j.modalidad, j.provincia,
         j.ciudad, j.tipo_contrato, j.habilidades, j.creado_en,
         c.nombre, c.logo_url, c.sector, c.verificada,
         public.coincidencias(j.habilidades, coalesce(cp.habilidades, '{}')) as puntos,
         coalesce(j.destacada_hasta > now(), false) as destacada
  from public.jobs j
  join public.companies c on c.id = j.company_id
  left join public.candidate_profiles cp on cp.user_id = auth.uid()
  where j.activa
    and not exists (select 1 from public.candidate_swipes s where s.candidate_id = auth.uid() and s.job_id = j.id)
    and not public.esta_bloqueado(c.owner_id)
    and (p_provincias is null or cardinality(p_provincias) = 0 or j.provincia = any(p_provincias) or j.modalidad = 'remoto')
    and (p_modalidades is null or cardinality(p_modalidades) = 0 or j.modalidad = any(p_modalidades))
    and (p_salario_min is null or j.salario_max is null or j.salario_max >= p_salario_min)
  order by destacada desc, puntos desc, j.creado_en desc
  limit least(greatest(p_limite, 1), 50)
$$;
revoke execute on function public.feed_candidato(text[], public.modalidad_trabajo[], numeric, int) from public, anon;
grant execute on function public.feed_candidato(text[], public.modalidad_trabajo[], numeric, int) to authenticated;
grant execute on function public.pagos_activos() to authenticated;
