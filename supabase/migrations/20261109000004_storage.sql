-- =====================================================================
-- ChambaMatch · 0004 · Storage. Convención de ruta: {user_id}/archivo
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true,  2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('logos',   'logos',   true,  2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('cvs',     'cvs',     false, 5242880, array['application/pdf'])
on conflict (id) do nothing;

create policy "storage: subir a mi carpeta" on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars', 'logos', 'cvs') and (storage.foldername(name))[1] = auth.uid()::text);

create policy "storage: reemplazar lo mío" on storage.objects for update to authenticated
  using (bucket_id in ('avatars', 'logos', 'cvs') and (storage.foldername(name))[1] = auth.uid()::text);

create policy "storage: borrar lo mío" on storage.objects for delete to authenticated
  using (bucket_id in ('avatars', 'logos', 'cvs') and (storage.foldername(name))[1] = auth.uid()::text);

-- Lectura de lo propio en buckets públicos (necesaria para 'upsert')
create policy "storage: leer lo mío" on storage.objects for select to authenticated
  using (bucket_id in ('avatars', 'logos') and (storage.foldername(name))[1] = auth.uid()::text);

-- CV: solo el dueño o alguien con match (se sirve con URL firmada)
create policy "storage: leer CV" on storage.objects for select to authenticated
  using (bucket_id = 'cvs' and ((storage.foldername(name))[1] = auth.uid()::text
         or public.hay_match_con(((storage.foldername(name))[1])::uuid)));
