-- =====================================================================
-- ChambaMatch · 0005 · Fase 2: filtros, notificaciones push, borrar cuenta
-- =====================================================================

-- Filtros del feed del candidato (provincias, modalidades, salario mínimo)
alter table public.candidate_profiles add column filtros jsonb not null default '{}';
grant update (filtros) on public.candidate_profiles to authenticated;

-- ---------------------------------------------------------------------
-- Suscripciones Web Push (una por navegador/dispositivo)
-- ---------------------------------------------------------------------
create table public.push_subscriptions (
  id        bigint generated always as identity primary key,
  user_id   uuid not null references public.profiles on delete cascade,
  endpoint  text not null unique,
  p256dh    text not null,
  auth      text not null,
  creado_en timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
grant select, insert (user_id, endpoint, p256dh, auth), delete on public.push_subscriptions to authenticated;

create policy "push: ver las mías" on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
create policy "push: registrar" on public.push_subscriptions for insert to authenticated with check (user_id = auth.uid());
create policy "push: borrar las mías" on public.push_subscriptions for delete to authenticated using (user_id = auth.uid());

-- Marcas anti-spam: cada mensaje o match se notifica una sola vez
alter table public.messages add column notificado_en timestamptz;
alter table public.matches  add column notificado_en timestamptz;

-- Devuelve las suscripciones del DESTINATARIO de un mensaje.
-- Solo el remitente, solo una vez y solo en los 2 minutos siguientes al envío.
create function public.preparar_push_mensaje(p_message uuid)
returns table (endpoint text, p256dh text, auth text, remitente text, match_id uuid, vista_previa text)
language plpgsql security definer set search_path = '' as $$
declare
  v_msg public.messages%rowtype;
  v_dest uuid;
  v_remitente text;
begin
  update public.messages m set notificado_en = now()
  where m.id = p_message and m.sender_id = auth.uid() and m.notificado_en is null
    and m.creado_en > now() - interval '2 minutes'
  returning * into v_msg;
  if not found or public.match_bloqueado(v_msg.match_id) then return; end if;

  select case when ma.candidate_id = auth.uid() then c.owner_id else ma.candidate_id end,
         case when ma.candidate_id = auth.uid() then p.nombre else c.nombre end
    into v_dest, v_remitente
  from public.matches ma
  join public.companies c on c.id = ma.company_id
  join public.profiles p on p.id = ma.candidate_id
  where ma.id = v_msg.match_id;

  return query
    select s.endpoint, s.p256dh, s.auth, v_remitente, v_msg.match_id, left(v_msg.cuerpo, 120)
    from public.push_subscriptions s where s.user_id = v_dest;
end $$;

-- Devuelve las suscripciones del CANDIDATO de un match nuevo.
-- Solo la empresa del match, una sola vez.
create function public.preparar_push_match(p_match uuid)
returns table (endpoint text, p256dh text, auth text, empresa text, titulo text)
language plpgsql security definer set search_path = '' as $$
declare
  v_match public.matches%rowtype;
begin
  update public.matches ma set notificado_en = now()
  where ma.id = p_match and ma.notificado_en is null
    and ma.company_id = public.mi_company_id()
    and ma.creado_en > now() - interval '10 minutes'
  returning * into v_match;
  if not found then return; end if;

  return query
    select s.endpoint, s.p256dh, s.auth, c.nombre, j.titulo
    from public.push_subscriptions s
    join public.companies c on c.id = v_match.company_id
    join public.jobs j on j.id = v_match.job_id
    where s.user_id = v_match.candidate_id;
end $$;

-- Derecho de cancelación (Ley 81): borra la cuenta y, en cascada, todos sus datos.
-- Los archivos de Storage los borra el cliente antes de llamar a esta función.
create function public.borrar_mi_cuenta() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'No autorizado' using errcode = '42501'; end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke execute on function public.preparar_push_mensaje(uuid), public.preparar_push_match(uuid),
  public.borrar_mi_cuenta() from public, anon;
grant execute on function public.preparar_push_mensaje(uuid), public.preparar_push_match(uuid),
  public.borrar_mi_cuenta() to authenticated;
