-- =====================================================================
-- ChambaMatch · 0003 · Row Level Security y permisos por columna
-- =====================================================================

alter table public.provincias         enable row level security;
alter table public.profiles           enable row level security;
alter table public.contactos_privados enable row level security;
alter table public.candidate_profiles enable row level security;
alter table public.companies          enable row level security;
alter table public.jobs               enable row level security;
alter table public.candidate_swipes   enable row level security;
alter table public.company_swipes     enable row level security;
alter table public.matches            enable row level security;
alter table public.messages           enable row level security;
alter table public.consentimientos    enable row level security;
alter table public.reports            enable row level security;
alter table public.blocks             enable row level security;
alter table public.interviews         enable row level security;

-- Permisos base: anon no accede a nada; authenticated, solo lo explícito.
revoke all on all tables in schema public from anon, authenticated;

grant select on public.provincias, public.companies, public.matches,
                public.interviews, public.mis_postulaciones to authenticated;
grant select, update (nombre, foto_url, provincia, onboarding_completo) on public.profiles to authenticated;
grant select, update (telefono) on public.contactos_privados to authenticated;
grant select,
      insert (user_id, titulo, anios_experiencia, habilidades, salario_esperado, modalidad, disponibilidad, bio, cv_url),
      update (titulo, anios_experiencia, habilidades, salario_esperado, modalidad, disponibilidad, bio, cv_url, actualizado_en)
  on public.candidate_profiles to authenticated;
grant insert (owner_id, nombre, logo_url, sector, provincia),
      update (nombre, logo_url, sector, provincia) on public.companies to authenticated;
grant select, delete,
      insert (company_id, titulo, descripcion, salario_min, salario_max, modalidad, provincia, ciudad, tipo_contrato, habilidades, activa),
      update (titulo, descripcion, salario_min, salario_max, modalidad, provincia, ciudad, tipo_contrato, habilidades, activa)
  on public.jobs to authenticated;
grant select, insert (candidate_id, job_id, direccion) on public.candidate_swipes to authenticated;
grant select, insert (job_id, candidate_id, direccion) on public.company_swipes to authenticated;
grant select, insert (match_id, sender_id, cuerpo) on public.messages to authenticated;
grant select, insert (user_id, tipo, version), update (revocado_en) on public.consentimientos to authenticated;
grant select, insert (reporter_id, reported_id, match_id, motivo, detalle) on public.reports to authenticated;
grant select, insert (blocker_id, blocked_id), delete on public.blocks to authenticated;

-- provincias ----------------------------------------------------------
create policy "provincias: lectura" on public.provincias for select to authenticated using (true);

-- profiles: yo, candidatos que se postularon a mi empresa, o mis matches
create policy "profiles: ver" on public.profiles for select to authenticated
  using (id = auth.uid() or public.se_postulo_a_mi_empresa(id) or public.hay_match_con(id));
create policy "profiles: editar el mío" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- contactos: SOLO yo o alguien con quien tengo match
create policy "contactos: ver" on public.contactos_privados for select to authenticated
  using (user_id = auth.uid() or public.hay_match_con(user_id));
create policy "contactos: editar el mío" on public.contactos_privados for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- candidate_profiles --------------------------------------------------
create policy "cand: ver" on public.candidate_profiles for select to authenticated
  using (user_id = auth.uid() or public.se_postulo_a_mi_empresa(user_id) or public.hay_match_con(user_id));
create policy "cand: crear el mío" on public.candidate_profiles for insert to authenticated
  with check (user_id = auth.uid() and public.mi_rol() = 'candidato');
create policy "cand: editar el mío" on public.candidate_profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- companies: información pública dentro de la app ----------------------
create policy "companies: ver" on public.companies for select to authenticated using (true);
create policy "companies: crear la mía" on public.companies for insert to authenticated
  with check (owner_id = auth.uid() and public.mi_rol() = 'empresa');
create policy "companies: editar la mía" on public.companies for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- jobs: activas para todos; las mías siempre; las que ya deslicé ------
create policy "jobs: ver" on public.jobs for select to authenticated
  using (activa or public.es_mi_job(id)
         or exists (select 1 from public.candidate_swipes s where s.job_id = jobs.id and s.candidate_id = auth.uid()));
create policy "jobs: crear" on public.jobs for insert to authenticated
  with check (company_id = public.mi_company_id());
create policy "jobs: editar" on public.jobs for update to authenticated
  using (company_id = public.mi_company_id()) with check (company_id = public.mi_company_id());
create policy "jobs: borrar" on public.jobs for delete to authenticated
  using (company_id = public.mi_company_id());

-- candidate_swipes: el candidato ve los suyos; la empresa NUNCA ve los 'left'
create policy "cswipes: ver" on public.candidate_swipes for select to authenticated
  using (candidate_id = auth.uid() or (direccion <> 'left' and public.es_mi_job(job_id)));
create policy "cswipes: crear" on public.candidate_swipes for insert to authenticated
  with check (candidate_id = auth.uid() and public.mi_rol() = 'candidato'
              and exists (select 1 from public.jobs j where j.id = job_id and j.activa));

-- company_swipes: invisibles para el candidato -------------------------
create policy "eswipes: ver" on public.company_swipes for select to authenticated
  using (public.es_mi_job(job_id));
create policy "eswipes: crear" on public.company_swipes for insert to authenticated
  with check (public.es_mi_job(job_id) and exists (
    select 1 from public.candidate_swipes s
    where s.job_id = company_swipes.job_id and s.candidate_id = company_swipes.candidate_id
      and s.direccion <> 'left'));

-- matches: solo lectura para los participantes (los crea el trigger) ---
create policy "matches: ver" on public.matches for select to authenticated
  using (candidate_id = auth.uid() or company_id = public.mi_company_id());

-- messages: solo los dos participantes, sin bloqueo de por medio ------
create policy "messages: ver" on public.messages for select to authenticated
  using (public.es_participante(match_id));
create policy "messages: enviar" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.es_participante(match_id)
              and not public.match_bloqueado(match_id));

-- consentimientos, reportes, bloqueos ---------------------------------
create policy "consent: ver" on public.consentimientos for select to authenticated using (user_id = auth.uid());
create policy "consent: dar" on public.consentimientos for insert to authenticated with check (user_id = auth.uid());
create policy "consent: revocar" on public.consentimientos for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "reports: ver los míos" on public.reports for select to authenticated using (reporter_id = auth.uid());
create policy "reports: crear" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "blocks: ver los míos" on public.blocks for select to authenticated using (blocker_id = auth.uid());
create policy "blocks: bloquear" on public.blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy "blocks: desbloquear" on public.blocks for delete to authenticated using (blocker_id = auth.uid());

-- interviews (Fase 3): escritura solo desde el servidor (service role)
create policy "interviews: ver" on public.interviews for select to authenticated
  using (candidate_id = auth.uid() or (match_id is not null and public.es_participante(match_id)));

-- Funciones: nadie anónimo; authenticated solo las necesarias ----------
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.elegir_rol(public.rol_usuario), public.marcar_leidos(uuid),
  public.feed_candidato(text[], public.modalidad_trabajo[], numeric, int),
  public.feed_empresa(uuid, int),
  public.mi_rol(), public.mi_company_id(), public.es_mi_job(uuid),
  public.se_postulo_a_mi_empresa(uuid), public.hay_match_con(uuid), public.es_participante(uuid),
  public.esta_bloqueado(uuid), public.match_bloqueado(uuid), public.coincidencias(text[], text[])
  to authenticated;

-- Realtime (respeta RLS) ---------------------------------------------
alter publication supabase_realtime add table public.messages, public.matches;
