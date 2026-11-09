-- =====================================================================
-- ChambaMatch · 0002 · Funciones auxiliares, triggers, feeds y vistas
-- Las funciones auxiliares son SECURITY DEFINER para que las políticas
-- RLS puedan consultarlas sin recursión.
-- =====================================================================

create function public.mi_rol() returns public.rol_usuario
language sql stable security definer set search_path = '' as $$
  select rol from public.profiles where id = auth.uid()
$$;

create function public.mi_company_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.companies where owner_id = auth.uid()
$$;

create function public.es_mi_job(p_job uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.jobs j join public.companies c on c.id = j.company_id
    where j.id = p_job and c.owner_id = auth.uid())
$$;

-- ¿Este candidato se postuló (right o super) a alguna vacante de mi empresa?
create function public.se_postulo_a_mi_empresa(p_candidate uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.candidate_swipes s
    join public.jobs j on j.id = s.job_id
    join public.companies c on c.id = j.company_id
    where s.candidate_id = p_candidate and s.direccion <> 'left' and c.owner_id = auth.uid())
$$;

-- ¿Tengo un match con este usuario (candidato o dueño de empresa)?
create function public.hay_match_con(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.matches m join public.companies c on c.id = m.company_id
    where (m.candidate_id = auth.uid() and c.owner_id = p_user)
       or (m.candidate_id = p_user and c.owner_id = auth.uid()))
$$;

create function public.es_participante(p_match uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.matches m join public.companies c on c.id = m.company_id
    where m.id = p_match and (m.candidate_id = auth.uid() or c.owner_id = auth.uid()))
$$;

create function public.esta_bloqueado(p_otro uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = auth.uid() and blocked_id = p_otro)
       or (blocker_id = p_otro and blocked_id = auth.uid()))
$$;

create function public.match_bloqueado(p_match uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.matches m
    join public.companies c on c.id = m.company_id
    join public.blocks b on (b.blocker_id = m.candidate_id and b.blocked_id = c.owner_id)
                         or (b.blocker_id = c.owner_id and b.blocked_id = m.candidate_id)
    where m.id = p_match)
$$;

-- Cantidad de habilidades en común (sin importar mayúsculas ni espacios)
create function public.coincidencias(a text[], b text[]) returns int
language sql immutable set search_path = '' as $$
  select count(*)::int from (
    select lower(trim(x)) from unnest(a) x
    intersect
    select lower(trim(y)) from unnest(b) y) t
$$;

-- ---------------------------------------------------------------------
-- Al registrarse: crear profile y contacto privado
-- ---------------------------------------------------------------------
create function public.al_crear_usuario() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, nombre, foto_url)
  values (new.id,
          coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
          new.raw_user_meta_data ->> 'avatar_url');
  insert into public.contactos_privados (user_id, email) values (new.id, new.email);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.al_crear_usuario();

-- El rol se elige una sola vez
create function public.elegir_rol(p_rol public.rol_usuario) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set rol = p_rol where id = auth.uid() and rol is null;
  if not found then
    raise exception 'El rol ya fue elegido' using errcode = 'P0001';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Súper Chamba: 1 por día (hora de Panamá). Se valida en la BD.
-- ---------------------------------------------------------------------
create function public.validar_swipe_candidato() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.creado_en := now();
  if new.direccion = 'super' and exists (
       select 1 from public.candidate_swipes
       where candidate_id = new.candidate_id and direccion = 'super'
         and (creado_en at time zone 'America/Panama')::date = (now() at time zone 'America/Panama')::date)
  then
    raise exception 'Ya usaste tu Súper Chamba de hoy. Vuelve mañana.' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger antes_swipe_candidato before insert on public.candidate_swipes
  for each row execute function public.validar_swipe_candidato();

-- ---------------------------------------------------------------------
-- MATCH: lo crea la BD cuando la empresa dice que sí a quien se postuló
-- ---------------------------------------------------------------------
create function public.crear_match() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.direccion = 'right' and exists (
       select 1 from public.candidate_swipes
       where candidate_id = new.candidate_id and job_id = new.job_id and direccion in ('right', 'super'))
  then
    insert into public.matches (job_id, candidate_id, company_id)
    select new.job_id, new.candidate_id, j.company_id from public.jobs j where j.id = new.job_id
    on conflict (job_id, candidate_id) do nothing;
  end if;
  return new;
end $$;

create trigger despues_swipe_empresa after insert on public.company_swipes
  for each row execute function public.crear_match();

-- Marca como leídos los mensajes del otro participante
create function public.marcar_leidos(p_match uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_participante(p_match) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  update public.messages set leido_en = now()
  where match_id = p_match and sender_id <> auth.uid() and leido_en is null;
end $$;

-- Mensajes: fecha siempre del servidor
create function public.validar_mensaje() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.creado_en := now();
  new.leido_en := null;
  return new;
end $$;

create trigger antes_mensaje before insert on public.messages
  for each row execute function public.validar_mensaje();

-- ---------------------------------------------------------------------
-- FEEDS (security invoker: respetan RLS del usuario)
-- ---------------------------------------------------------------------
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
  coincidencias int)
language sql stable security invoker set search_path = '' as $$
  select j.id, j.titulo, j.descripcion, j.salario_min, j.salario_max, j.modalidad, j.provincia,
         j.ciudad, j.tipo_contrato, j.habilidades, j.creado_en,
         c.nombre, c.logo_url, c.sector, c.verificada,
         public.coincidencias(j.habilidades, coalesce(cp.habilidades, '{}')) as puntos
  from public.jobs j
  join public.companies c on c.id = j.company_id
  left join public.candidate_profiles cp on cp.user_id = auth.uid()
  where j.activa
    and not exists (select 1 from public.candidate_swipes s where s.candidate_id = auth.uid() and s.job_id = j.id)
    and not public.esta_bloqueado(c.owner_id)
    and (p_provincias is null or cardinality(p_provincias) = 0 or j.provincia = any(p_provincias) or j.modalidad = 'remoto')
    and (p_modalidades is null or cardinality(p_modalidades) = 0 or j.modalidad = any(p_modalidades))
    and (p_salario_min is null or j.salario_max is null or j.salario_max >= p_salario_min)
  order by (j.destacada_hasta is not null and j.destacada_hasta > now()) desc, puntos desc, j.creado_en desc
  limit least(greatest(p_limite, 1), 50)
$$;

create function public.feed_empresa(p_job uuid, p_limite int default 20)
returns table (
  candidate_id uuid, nombre text, foto_url text, provincia text, titulo text,
  anios_experiencia smallint, habilidades text[], salario_esperado numeric,
  modalidad public.modalidad_trabajo, disponibilidad text, bio text,
  es_super boolean, coincidencias int, postulado_en timestamptz)
language sql stable security invoker set search_path = '' as $$
  select s.candidate_id, p.nombre, p.foto_url, p.provincia, cp.titulo, cp.anios_experiencia,
         cp.habilidades, cp.salario_esperado, cp.modalidad, cp.disponibilidad, cp.bio,
         s.direccion = 'super' as super,
         public.coincidencias(cp.habilidades, j.habilidades) as puntos,
         s.creado_en
  from public.candidate_swipes s
  join public.jobs j on j.id = s.job_id
  join public.profiles p on p.id = s.candidate_id
  join public.candidate_profiles cp on cp.user_id = s.candidate_id
  where s.job_id = p_job
    and public.es_mi_job(p_job)
    and s.direccion in ('right', 'super')
    and not exists (select 1 from public.company_swipes cs where cs.job_id = p_job and cs.candidate_id = s.candidate_id)
    and not public.esta_bloqueado(s.candidate_id)
  order by super desc, puntos desc, s.creado_en
  limit least(greatest(p_limite, 1), 50)
$$;

-- "Mis postulaciones": nunca expone la decisión de la empresa
create view public.mis_postulaciones with (security_invoker = true) as
select s.job_id, j.titulo, c.nombre as empresa, c.logo_url, j.provincia, j.ciudad,
       s.direccion, s.creado_en, m.id as match_id,
       case when m.id is not null then 'match'
            when not j.activa      then 'cerrada'
            else 'enviada' end as estado
from public.candidate_swipes s
join public.jobs j on j.id = s.job_id
join public.companies c on c.id = j.company_id
left join public.matches m on m.job_id = s.job_id and m.candidate_id = s.candidate_id
where s.candidate_id = auth.uid() and s.direccion <> 'left';
