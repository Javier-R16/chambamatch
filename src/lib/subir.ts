import type { SupabaseClient } from "@supabase/supabase-js";

type Bucket = "avatars" | "logos" | "cvs";

/**
 * Sube un archivo a {uid}/... dentro del bucket.
 * Devuelve la URL pública (avatars, logos) o la ruta interna (cvs, privado).
 */
export async function subirArchivo(supabase: SupabaseClient, bucket: Bucket, uid: string, archivo: File) {
  const ext = archivo.name.split(".").pop()?.toLowerCase() ?? "bin";
  const ruta = `${uid}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(ruta, archivo, {
    contentType: archivo.type,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  if (bucket === "cvs") return ruta;
  return supabase.storage.from(bucket).getPublicUrl(ruta).data.publicUrl;
}
