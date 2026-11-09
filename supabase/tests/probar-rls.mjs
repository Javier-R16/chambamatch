// Pruebas de RLS sin Docker: corre las migraciones en un Postgres embebido (PGlite)
// con un "Supabase mínimo" simulado (auth.uid(), roles, storage) y verifica
// que nadie pueda leer lo que no le corresponde.
//
// Uso:  npm run test:rls
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const db = new PGlite();

// ---------- Simulación mínima de Supabase ----------
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;

  create schema auth;
  grant usage on schema auth to anon, authenticated;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant execute on function auth.uid() to anon, authenticated;

  create schema storage;
  grant usage on schema storage to authenticated;
  create table storage.buckets (id text primary key, name text, public boolean,
    file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant select, insert, update, delete on storage.objects to authenticated;
  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  grant execute on function storage.foldername(text) to authenticated;

  create publication supabase_realtime;
`);

for (const f of readdirSync(join(raiz, "migrations")).sort()) {
  try {
    await db.exec(readFileSync(join(raiz, "migrations", f), "utf8"));
    console.log("✔ migración", f);
  } catch (e) {
    console.error("✘ migración", f, "\n ", e.message);
    process.exit(1);
  }
}

// ---------- Datos: 2 candidatos, 2 empresas ----------
const U = {
  ana: "00000000-0000-0000-0000-00000000000a",   // candidata
  beto: "00000000-0000-0000-0000-00000000000b",  // candidato
  emp1: "00000000-0000-0000-0000-0000000000e1",  // dueño empresa 1
  emp2: "00000000-0000-0000-0000-0000000000e2",  // dueño empresa 2
};
await db.exec(`
  insert into auth.users (id, email) values
    ('${U.ana}', 'ana@test.pa'), ('${U.beto}', 'beto@test.pa'),
    ('${U.emp1}', 'rh1@test.pa'), ('${U.emp2}', 'rh2@test.pa');
  update public.contactos_privados set telefono = '+507 6000-0000';
`);

async function como(uid, sql, params = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false);`);
  await db.exec(uid ? "set role authenticated" : "set role anon");
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec("reset role");
  }
}

let fallos = 0;
async function esperaOk(nombre, fn) {
  try { await fn(); console.log("  ✔", nombre); }
  catch (e) { fallos++; console.error("  ✘", nombre, "→", e.message); }
}
async function esperaError(nombre, fn) {
  try { await fn(); fallos++; console.error("  ✘", nombre, "→ debía fallar y no falló"); }
  catch { console.log("  ✔", nombre); }
}
function igual(real, esperado, msg) {
  if (real !== esperado) throw new Error(`${msg}: esperado ${esperado}, obtenido ${real}`);
}

console.log("\nOnboarding");
await esperaOk("Ana elige rol candidato", () => como(U.ana, "select public.elegir_rol('candidato')"));
await esperaOk("Beto elige rol candidato", () => como(U.beto, "select public.elegir_rol('candidato')"));
await esperaOk("Empresa 1 elige rol", () => como(U.emp1, "select public.elegir_rol('empresa')"));
await esperaOk("Empresa 2 elige rol", () => como(U.emp2, "select public.elegir_rol('empresa')"));
await esperaError("No se puede cambiar el rol", () => como(U.ana, "select public.elegir_rol('empresa')"));
await esperaError("No se puede cambiar el rol con UPDATE directo", () =>
  como(U.ana, "update public.profiles set rol = 'empresa' where id = auth.uid()"));
await esperaOk("Ana crea su perfil", () => como(U.ana,
  "insert into public.candidate_profiles (user_id, titulo, habilidades) values (auth.uid(), 'Cajera', '{excel,ventas}')"));
await esperaOk("Beto crea su perfil", () => como(U.beto,
  "insert into public.candidate_profiles (user_id, titulo, habilidades) values (auth.uid(), 'Chofer', '{licencia}')"));
await esperaError("Un candidato no puede crear empresa", () => como(U.ana,
  "insert into public.companies (owner_id, nombre) values (auth.uid(), 'Falsa')"));
await esperaOk("Empresa 1 crea su empresa", () => como(U.emp1,
  "insert into public.companies (owner_id, nombre) values (auth.uid(), 'Abarrotes La Esquina Demo')"));
await esperaOk("Empresa 2 crea su empresa", () => como(U.emp2,
  "insert into public.companies (owner_id, nombre) values (auth.uid(), 'Otra SA')"));
await esperaError("La empresa no puede autoverificarse", () => como(U.emp1,
  "update public.companies set verificada = true where owner_id = auth.uid()"));

const job1 = (await como(U.emp1, `insert into public.jobs (company_id, titulo, descripcion, modalidad, provincia, habilidades)
  values (public.mi_company_id(), 'Cajero/a', 'Turnos rotativos', 'presencial', 'Chiriquí', '{ventas,excel}') returning id`)).rows[0].id;
await esperaError("Empresa 2 no puede crear vacantes para la empresa 1", async () => {
  const c1 = (await db.query("select id from public.companies where owner_id = $1", [U.emp1])).rows[0].id;
  await como(U.emp2, `insert into public.jobs (company_id, titulo, descripcion, modalidad, provincia) values ('${c1}', 'x', 'x', 'remoto', 'Panamá')`);
});
await esperaError("Empresa no puede marcarse destacada gratis", () => como(U.emp1,
  `update public.jobs set destacada_hasta = now() + interval '30 days' where id = '${job1}'`));

console.log("\nSwipes y privacidad");
await esperaOk("Feed del candidato muestra la vacante", async () => {
  const r = await como(U.ana, "select * from public.feed_candidato()");
  igual(r.rows.length, 1, "vacantes en feed");
  igual(r.rows[0].coincidencias, 2, "coincidencias");
});
await esperaOk("Ana se postula con Súper Chamba", () => como(U.ana,
  `insert into public.candidate_swipes (candidate_id, job_id, direccion) values (auth.uid(), '${job1}', 'super')`));
await esperaOk("Beto descarta (left)", () => como(U.beto,
  `insert into public.candidate_swipes (candidate_id, job_id, direccion) values (auth.uid(), '${job1}', 'left')`));
await esperaError("No se puede deslizar en nombre de otro", () => como(U.beto,
  `insert into public.candidate_swipes (candidate_id, job_id, direccion) values ('${U.ana}', '${job1}', 'right')`));
await esperaOk("Feed ya no repite la vacante", async () => {
  igual((await como(U.ana, "select * from public.feed_candidato()")).rows.length, 0, "vacantes en feed");
});
await esperaOk("La empresa NO ve el swipe a la izquierda de Beto", async () => {
  const r = await como(U.emp1, "select candidate_id, direccion from public.candidate_swipes");
  igual(r.rows.length, 1, "swipes visibles");
  igual(r.rows[0].candidate_id, U.ana, "solo Ana");
});
await esperaOk("La empresa NO ve el perfil de Beto (no se postuló)", async () => {
  igual((await como(U.emp1, `select 1 from public.profiles where id = '${U.beto}'`)).rows.length, 0, "filas");
  igual((await como(U.emp1, `select 1 from public.candidate_profiles where user_id = '${U.beto}'`)).rows.length, 0, "filas");
});
await esperaOk("Empresa 2 NO ve a Ana (no se postuló a ella)", async () => {
  igual((await como(U.emp2, `select 1 from public.candidate_profiles where user_id = '${U.ana}'`)).rows.length, 0, "filas");
  igual((await como(U.emp2, "select * from public.feed_empresa($1)", [job1])).rows.length, 0, "feed ajeno");
});
await esperaOk("Empresa 1 ve a Ana en su feed (con Súper)", async () => {
  const r = await como(U.emp1, "select * from public.feed_empresa($1)", [job1]);
  igual(r.rows.length, 1, "postulantes");
  igual(r.rows[0].es_super, true, "es_super");
});
await esperaOk("Teléfono/correo de Ana ocultos ANTES del match", async () => {
  igual((await como(U.emp1, `select * from public.contactos_privados where user_id = '${U.ana}'`)).rows.length, 0, "filas");
});
await esperaOk("Ana no ve swipes de empresa", async () => {
  igual((await como(U.ana, "select * from public.company_swipes")).rows.length, 0, "filas");
});
await esperaError("Segunda Súper Chamba del día falla", async () => {
  const j2 = (await como(U.emp1, `insert into public.jobs (company_id, titulo, descripcion, modalidad, provincia)
    values (public.mi_company_id(), 'Bodeguero', 'x', 'presencial', 'Panamá') returning id`)).rows[0].id;
  await como(U.ana, `insert into public.candidate_swipes (candidate_id, job_id, direccion) values (auth.uid(), '${j2}', 'super')`);
});

console.log("\nMatch");
await esperaError("El cliente no puede crear matches", () => como(U.ana,
  `insert into public.matches (job_id, candidate_id, company_id) select '${job1}', auth.uid(), company_id from public.jobs where id = '${job1}'`));
await esperaError("Empresa no puede deslizar a Beto (no se postuló)", () => como(U.emp1,
  `insert into public.company_swipes (job_id, candidate_id, direccion) values ('${job1}', '${U.beto}', 'right')`));
await esperaOk("Empresa 1 desliza a la derecha a Ana → match", async () => {
  await como(U.emp1, `insert into public.company_swipes (job_id, candidate_id, direccion) values ('${job1}', '${U.ana}', 'right')`);
  igual((await como(U.ana, "select * from public.matches")).rows.length, 1, "matches de Ana");
});
const matchId = (await db.query("select id from public.matches")).rows[0].id;
await esperaOk("Tras el match, la empresa ve el contacto de Ana", async () => {
  igual((await como(U.emp1, `select * from public.contactos_privados where user_id = '${U.ana}'`)).rows.length, 1, "filas");
});
await esperaOk("Empresa 2 sigue sin ver el contacto de Ana", async () => {
  igual((await como(U.emp2, `select * from public.contactos_privados where user_id = '${U.ana}'`)).rows.length, 0, "filas");
});
await esperaOk("Mis postulaciones de Ana muestra 'match'", async () => {
  const r = await como(U.ana, "select estado from public.mis_postulaciones");
  igual(r.rows[0].estado, "match", "estado");
});

console.log("\nChat");
await esperaOk("Ana escribe en su chat", () => como(U.ana,
  `insert into public.messages (match_id, sender_id, cuerpo) values ('${matchId}', auth.uid(), 'Hola, ¿cuándo empiezo?')`));
await esperaOk("La empresa responde", () => como(U.emp1,
  `insert into public.messages (match_id, sender_id, cuerpo) values ('${matchId}', auth.uid(), '¡El lunes!')`));
await esperaError("Ana no puede firmar como la empresa", () => como(U.ana,
  `insert into public.messages (match_id, sender_id, cuerpo) values ('${matchId}', '${U.emp1}', 'falso')`));
await esperaOk("Beto NO puede leer el chat", async () => {
  igual((await como(U.beto, "select * from public.messages")).rows.length, 0, "mensajes");
});
await esperaError("Beto NO puede escribir en el chat", () => como(U.beto,
  `insert into public.messages (match_id, sender_id, cuerpo) values ('${matchId}', auth.uid(), 'intruso')`));
await esperaOk("Empresa 2 NO puede leer el chat", async () => {
  igual((await como(U.emp2, "select * from public.messages")).rows.length, 0, "mensajes");
});
await esperaError("Nadie puede editar mensajes", () => como(U.emp1,
  "update public.messages set cuerpo = 'editado'"));
await esperaOk("Marcar leídos", async () => {
  await como(U.ana, "select public.marcar_leidos($1)", [matchId]);
  const r = await db.query("select count(*)::int n from public.messages where leido_en is not null");
  igual(r.rows[0].n, 1, "leídos");
});
await esperaError("Beto no puede marcar leídos un chat ajeno", () => como(U.beto, "select public.marcar_leidos($1)", [matchId]));

console.log("\nBloqueo");
await esperaOk("Ana bloquea a la empresa y ya no puede recibir mensajes", async () => {
  await como(U.ana, `insert into public.blocks (blocker_id, blocked_id) values (auth.uid(), '${U.emp1}')`);
  let fallo = false;
  try {
    await como(U.emp1, `insert into public.messages (match_id, sender_id, cuerpo) values ('${matchId}', auth.uid(), 'hola?')`);
  } catch { fallo = true; }
  if (!fallo) throw new Error("el mensaje se envió");
});

console.log("\nAnónimo");
await esperaError("Un usuario anónimo no lee vacantes", () => como(null, "select * from public.jobs"));
await esperaError("Un usuario anónimo no lee perfiles", () => como(null, "select * from public.profiles"));

console.log("\nCandidato descartado");
await esperaOk("Si la empresa descarta, el candidato ve 'enviada' y luego 'cerrada'", async () => {
  await db.exec(`insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000c', 'caro@test.pa')`);
  const caro = "00000000-0000-0000-0000-00000000000c";
  await como(caro, "select public.elegir_rol('candidato')");
  await como(caro, "insert into public.candidate_profiles (user_id, titulo) values (auth.uid(), 'Mesera')");
  await como(caro, `insert into public.candidate_swipes (candidate_id, job_id, direccion) values (auth.uid(), '${job1}', 'right')`);
  await como(U.emp1, `insert into public.company_swipes (job_id, candidate_id, direccion) values ('${job1}', '${caro}', 'left')`);
  igual((await como(caro, "select estado from public.mis_postulaciones")).rows[0].estado, "enviada", "estado");
  await como(U.emp1, `update public.jobs set activa = false where id = '${job1}'`);
  igual((await como(caro, "select estado from public.mis_postulaciones")).rows[0].estado, "cerrada", "estado");
});

console.log("\nFase 2: filtros, push y borrar cuenta");
await esperaOk("El candidato guarda sus filtros", () => como(U.beto,
  `update public.candidate_profiles set filtros = '{"salario_min": 800}' where user_id = auth.uid()`));

const job2 = (await como(U.emp2, `insert into public.jobs (company_id, titulo, descripcion, modalidad, provincia)
  values (public.mi_company_id(), 'Chofer', 'Rutas', 'presencial', 'Colón') returning id`)).rows[0].id;
await como(U.beto, `insert into public.candidate_swipes (candidate_id, job_id, direccion) values (auth.uid(), '${job2}', 'right')`);
await como(U.emp2, `insert into public.company_swipes (job_id, candidate_id, direccion) values ('${job2}', '${U.beto}', 'right')`);
const match2 = (await db.query("select id from public.matches where job_id = $1", [job2])).rows[0].id;

await esperaOk("Beto registra su suscripción push", () => como(U.beto,
  "insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values (auth.uid(), 'https://push.test/beto', 'k', 'a')"));
await esperaError("No se puede registrar push a nombre de otro", () => como(U.beto,
  `insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ('${U.ana}', 'https://push.test/x', 'k', 'a')`));
await esperaOk("La empresa NO puede leer las suscripciones de Beto", async () => {
  igual((await como(U.emp2, "select * from public.push_subscriptions")).rows.length, 0, "filas");
});
await esperaOk("Beto no puede disparar el push de su propio match", async () => {
  igual((await como(U.beto, "select * from public.preparar_push_match($1)", [match2])).rows.length, 0, "filas");
});
await esperaOk("La empresa notifica el match una sola vez", async () => {
  igual((await como(U.emp2, "select * from public.preparar_push_match($1)", [match2])).rows.length, 1, "1ª vez");
  igual((await como(U.emp2, "select * from public.preparar_push_match($1)", [match2])).rows.length, 0, "2ª vez");
});
await esperaOk("Push de mensaje: solo el remitente y una sola vez", async () => {
  const msg = (await como(U.emp2, `insert into public.messages (match_id, sender_id, cuerpo) values ('${match2}', auth.uid(), '¿Puedes mañana?') returning id`)).rows[0].id;
  igual((await como(U.beto, "select * from public.preparar_push_mensaje($1)", [msg])).rows.length, 0, "no remitente");
  igual((await como(U.ana, "select * from public.preparar_push_mensaje($1)", [msg])).rows.length, 0, "tercero");
  const r = await como(U.emp2, "select * from public.preparar_push_mensaje($1)", [msg]);
  igual(r.rows.length, 1, "remitente");
  igual(r.rows[0].endpoint, "https://push.test/beto", "destino");
  igual((await como(U.emp2, "select * from public.preparar_push_mensaje($1)", [msg])).rows.length, 0, "repetido");
});
await esperaOk("Borrar cuenta elimina perfil y postulaciones", async () => {
  const caro = "00000000-0000-0000-0000-00000000000c";
  await como(caro, "select public.borrar_mi_cuenta()");
  igual((await db.query("select count(*)::int n from public.profiles where id = $1", [caro])).rows[0].n, 0, "perfil");
  igual((await db.query("select count(*)::int n from public.candidate_swipes where candidate_id = $1", [caro])).rows[0].n, 0, "swipes");
});
await esperaError("Anónimo no puede borrar cuentas", () => como(null, "select public.borrar_mi_cuenta()"));

console.log(fallos ? `\n✘ ${fallos} prueba(s) fallaron` : "\n✔ Todas las pruebas de RLS pasaron");
process.exit(fallos ? 1 : 0);
