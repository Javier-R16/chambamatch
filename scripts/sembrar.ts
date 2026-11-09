// Datos de prueba ficticios: 6 empresas, 20 vacantes y 10 candidatos.
// Uso: npm run sembrar   (necesita SUPABASE_SERVICE_ROLE_KEY en .env.local)
// ⚠ La service role key salta RLS: úsala SOLO en tu máquina, nunca en Vercel ni en el cliente.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const servicio = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !servicio) {
  console.error("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}
const db = createClient(url, servicio, { auth: { persistSession: false } });

const CLAVE = "ChambaDemo2026!";
const VERSION_CONSENTIMIENTO = "2026-11-v1";

type Mod = "presencial" | "remoto" | "hibrido";
type Contrato = "indefinido" | "temporal" | "por_obra" | "medio_tiempo" | "pasantia" | "freelance";

const EMPRESAS = [
  { clave: "ahorro", email: "rrhh.elahorro@example.com", persona: "Yaritza Pinzón", nombre: "Supermercados El Ahorro", sector: "Retail", provincia: "Chiriquí", tel: "+507 6011-2233" },
  { clave: "canal", email: "talento.canalexpress@example.com", persona: "Rubén Ábrego", nombre: "Logística Canal Express", sector: "Logística", provincia: "Colón", tel: "+507 6022-3344" },
  { clave: "tecno", email: "jobs.tecnoistmo@example.com", persona: "Daniela Chen", nombre: "TecnoIstmo Soluciones", sector: "Tecnología", provincia: "Panamá", tel: "+507 6033-4455" },
  { clave: "clinica", email: "rrhh.clinicasanjudas@example.com", persona: "Dr. Héctor Vergara", nombre: "Clínica San Judas", sector: "Salud", provincia: "Veraguas", tel: "+507 6044-5566" },
  { clave: "hotel", email: "personal.brisasazuero@example.com", persona: "Marisol Batista", nombre: "Hotel Brisas de Azuero", sector: "Turismo y hotelería", provincia: "Herrera", tel: "+507 6055-6677" },
  { clave: "banco", email: "seleccion.cooppacifico@example.com", persona: "Luis Carrasquilla", nombre: "Cooperativa Pacífico", sector: "Finanzas", provincia: "Panamá", tel: "+507 6066-7788" },
] as const;

type Vac = {
  empresa: (typeof EMPRESAS)[number]["clave"];
  titulo: string;
  descripcion: string;
  min: number | null;
  max: number | null;
  modalidad: Mod;
  provincia: string;
  ciudad: string;
  contrato: Contrato;
  habilidades: string[];
};

const VACANTES: Vac[] = [
  { empresa: "ahorro", titulo: "Cajero/a", descripcion: "Atención en caja, manejo de efectivo y tarjetas, cuadre de caja al cierre. Turnos rotativos de 8 horas, un día libre entre semana. Uniforme y bono de puntualidad.", min: 650, max: 750, modalidad: "presencial", provincia: "Chiriquí", ciudad: "David", contrato: "indefinido", habilidades: ["atención al cliente", "manejo de efectivo", "puntualidad"] },
  { empresa: "ahorro", titulo: "Reponedor/a de mercancía", descripcion: "Surtido de góndolas, control de fechas de vencimiento y rotación de producto. Horario de madrugada con recargo nocturno.", min: 600, max: 680, modalidad: "presencial", provincia: "Chiriquí", ciudad: "David", contrato: "indefinido", habilidades: ["inventario", "trabajo en equipo", "orden"] },
  { empresa: "ahorro", titulo: "Supervisor/a de tienda", descripcion: "Liderar un equipo de 15 colaboradores, asegurar metas de venta, control de mermas y horarios. Experiencia mínima de 2 años en retail.", min: 1100, max: 1400, modalidad: "presencial", provincia: "Chiriquí", ciudad: "David", contrato: "indefinido", habilidades: ["liderazgo", "ventas", "excel", "inventario"] },
  { empresa: "ahorro", titulo: "Panadero/a", descripcion: "Elaboración de pan y repostería para la sección de panadería. Turno de 4:00 a.m. a 12:00 m.", min: 700, max: 850, modalidad: "presencial", provincia: "Chiriquí", ciudad: "David", contrato: "indefinido", habilidades: ["panadería", "higiene alimentaria", "puntualidad"] },
  { empresa: "canal", titulo: "Montacarguista", descripcion: "Operación de montacargas en patio de contenedores de la Zona Libre. Licencia tipo E y certificación vigente.", min: 900, max: 1100, modalidad: "presencial", provincia: "Colón", ciudad: "Colón", contrato: "indefinido", habilidades: ["montacargas", "licencia tipo e", "seguridad industrial"] },
  { empresa: "canal", titulo: "Asistente de aduanas", descripcion: "Preparación de declaraciones, seguimiento de trámites en ANA y coordinación con navieras. Inglés intermedio.", min: 1000, max: 1300, modalidad: "hibrido", provincia: "Colón", ciudad: "Colón", contrato: "indefinido", habilidades: ["aduanas", "inglés", "excel", "comercio exterior"] },
  { empresa: "canal", titulo: "Bodeguero/a", descripcion: "Recepción, almacenaje y despacho de mercancía. Uso de escáner y sistema WMS.", min: 650, max: 750, modalidad: "presencial", provincia: "Colón", ciudad: "Colón", contrato: "temporal", habilidades: ["inventario", "trabajo en equipo", "orden"] },
  { empresa: "canal", titulo: "Conductor/a de reparto", descripcion: "Rutas de entrega entre Colón y Ciudad de Panamá en camión 5 toneladas. Licencia tipo D.", min: 850, max: 950, modalidad: "presencial", provincia: "Colón", ciudad: "Colón", contrato: "indefinido", habilidades: ["licencia tipo d", "puntualidad", "atención al cliente"] },
  { empresa: "tecno", titulo: "Desarrollador/a Frontend React", descripcion: "Construir interfaces web para clientes de banca y retail. React, TypeScript y Tailwind. Equipo ágil, 100% remoto dentro de Panamá.", min: 1800, max: 2600, modalidad: "remoto", provincia: "Panamá", ciudad: "Ciudad de Panamá", contrato: "indefinido", habilidades: ["react", "typescript", "tailwind", "git"] },
  { empresa: "tecno", titulo: "Soporte técnico N1", descripcion: "Atención de tickets, configuración de equipos y soporte a usuarios por teléfono y en sitio en Obarrio.", min: 800, max: 1000, modalidad: "hibrido", provincia: "Panamá", ciudad: "Ciudad de Panamá", contrato: "indefinido", habilidades: ["soporte técnico", "windows", "redes", "atención al cliente"] },
  { empresa: "tecno", titulo: "Analista de datos", descripcion: "Modelar datos de ventas, construir tableros en Power BI y automatizar reportes con SQL y Python.", min: 1500, max: 2000, modalidad: "remoto", provincia: "Panamá", ciudad: "Ciudad de Panamá", contrato: "indefinido", habilidades: ["sql", "power bi", "python", "excel"] },
  { empresa: "tecno", titulo: "Pasante de diseño UX/UI", descripcion: "Apoyo en prototipos en Figma y pruebas con usuarios. Ideal para estudiantes de último año.", min: 450, max: 500, modalidad: "hibrido", provincia: "Panamá", ciudad: "Ciudad de Panamá", contrato: "pasantia", habilidades: ["figma", "diseño", "creatividad"] },
  { empresa: "clinica", titulo: "Enfermero/a", descripcion: "Atención de pacientes en sala de hospitalización. Idoneidad vigente del Consejo Técnico de Salud. Turnos rotativos.", min: 1200, max: 1450, modalidad: "presencial", provincia: "Veraguas", ciudad: "Santiago", contrato: "indefinido", habilidades: ["enfermería", "idoneidad", "trabajo en equipo"] },
  { empresa: "clinica", titulo: "Recepcionista", descripcion: "Registro de pacientes, agenda de citas, cobro y atención telefónica.", min: 650, max: 750, modalidad: "presencial", provincia: "Veraguas", ciudad: "Santiago", contrato: "indefinido", habilidades: ["atención al cliente", "excel", "manejo de efectivo"] },
  { empresa: "clinica", titulo: "Técnico/a de laboratorio", descripcion: "Toma y procesamiento de muestras, control de calidad y reporte de resultados.", min: 1000, max: 1200, modalidad: "presencial", provincia: "Veraguas", ciudad: "Santiago", contrato: "indefinido", habilidades: ["laboratorio clínico", "idoneidad", "orden"] },
  { empresa: "hotel", titulo: "Mesero/a", descripcion: "Servicio en restaurante y eventos del hotel. Propinas aparte. Temporada de Carnaval y Festival del Manito con horas extra.", min: 600, max: 650, modalidad: "presencial", provincia: "Herrera", ciudad: "Chitré", contrato: "temporal", habilidades: ["atención al cliente", "trabajo en equipo", "inglés"] },
  { empresa: "hotel", titulo: "Recepcionista bilingüe", descripcion: "Check-in y check-out, reservas y atención a huéspedes nacionales y extranjeros. Inglés avanzado.", min: 800, max: 950, modalidad: "presencial", provincia: "Herrera", ciudad: "Chitré", contrato: "indefinido", habilidades: ["inglés", "atención al cliente", "reservas"] },
  { empresa: "hotel", titulo: "Cocinero/a de línea", descripcion: "Preparación de platos típicos e internacionales. Carné de manipulación de alimentos.", min: 750, max: 900, modalidad: "presencial", provincia: "Herrera", ciudad: "Chitré", contrato: "indefinido", habilidades: ["cocina", "higiene alimentaria", "trabajo en equipo"] },
  { empresa: "banco", titulo: "Oficial de crédito", descripcion: "Análisis de solicitudes de préstamos personales, visitas a clientes y cumplimiento de metas de colocación.", min: 1300, max: 1700, modalidad: "presencial", provincia: "Panamá", ciudad: "Ciudad de Panamá", contrato: "indefinido", habilidades: ["análisis de crédito", "ventas", "excel"] },
  { empresa: "banco", titulo: "Agente de call center", descripcion: "Atención de llamadas de socios, consultas de saldo y gestión de cobros. Desde casa con equipo provisto.", min: 700, max: 800, modalidad: "remoto", provincia: "Panamá", ciudad: "Ciudad de Panamá", contrato: "medio_tiempo", habilidades: ["atención al cliente", "cobros", "excel"] },
];

const CANDIDATOS = [
  { email: "ana.gonzalez.demo@example.com", nombre: "Ana González", provincia: "Chiriquí", tel: "+507 6100-1001", titulo: "Cajera con experiencia", anios: 3, hab: ["atención al cliente", "manejo de efectivo", "puntualidad", "excel"], salario: 700, mod: "presencial", disp: "Inmediata", bio: "Tres años como cajera en supermercado en David. Responsable y con buen trato al cliente.", aplica: [0, 13], super: 0 },
  { email: "carlos.rodriguez.demo@example.com", nombre: "Carlos Rodríguez", provincia: "Colón", tel: "+507 6100-1002", titulo: "Operador de montacargas", anios: 6, hab: ["montacargas", "licencia tipo e", "seguridad industrial", "inventario"], salario: 1000, mod: "presencial", disp: "15 días", bio: "Operador certificado con experiencia en Zona Libre y puertos.", aplica: [4, 6], super: 4 },
  { email: "maria.sanchez.demo@example.com", nombre: "María Sánchez", provincia: "Panamá", tel: "+507 6100-1003", titulo: "Desarrolladora web", anios: 4, hab: ["react", "typescript", "tailwind", "git", "figma"], salario: 2200, mod: "remoto", disp: "1 mes", bio: "Frontend con 4 años en startups. Me encanta el detalle en la interfaz.", aplica: [8, 11], super: 8 },
  { email: "jose.castillo.demo@example.com", nombre: "José Castillo", provincia: "Veraguas", tel: "+507 6100-1004", titulo: "Enfermero idóneo", anios: 5, hab: ["enfermería", "idoneidad", "trabajo en equipo"], salario: 1300, mod: "presencial", disp: "Inmediata", bio: "Enfermero con idoneidad vigente, experiencia en urgencias en Santiago.", aplica: [12], super: 12 },
  { email: "lucia.moreno.demo@example.com", nombre: "Lucía Moreno", provincia: "Herrera", tel: "+507 6100-1005", titulo: "Recepcionista bilingüe", anios: 2, hab: ["inglés", "atención al cliente", "reservas", "excel"], salario: 850, mod: "presencial", disp: "Inmediata", bio: "Inglés avanzado. Trabajé en hostal en Pedasí atendiendo turistas.", aplica: [16, 15, 13], super: 16 },
  { email: "pedro.herrera.demo@example.com", nombre: "Pedro Herrera", provincia: "Colón", tel: "+507 6100-1006", titulo: "Conductor profesional", anios: 8, hab: ["licencia tipo d", "puntualidad", "atención al cliente"], salario: 900, mod: "presencial", disp: "Inmediata", bio: "Ocho años de conductor de reparto sin accidentes.", aplica: [7, 6], super: null },
  { email: "sofia.ruiz.demo@example.com", nombre: "Sofía Ruiz", provincia: "Panamá", tel: "+507 6100-1007", titulo: "Analista de datos junior", anios: 1, hab: ["sql", "excel", "power bi", "python"], salario: 1400, mod: "remoto", disp: "Inmediata", bio: "Ingeniera industrial de la UTP. Automatizo reportes y armo tableros.", aplica: [10, 18], super: 10 },
  { email: "miguel.vasquez.demo@example.com", nombre: "Miguel Vásquez", provincia: "Herrera", tel: "+507 6100-1008", titulo: "Cocinero", anios: 4, hab: ["cocina", "higiene alimentaria", "panadería", "trabajo en equipo"], salario: 800, mod: "presencial", disp: "1 semana", bio: "Cocina típica azuerense e internacional. Carné de manipulación al día.", aplica: [17, 15, 3], super: 17 },
  { email: "valeria.ortega.demo@example.com", nombre: "Valeria Ortega", provincia: "Panamá Oeste", tel: "+507 6100-1009", titulo: "Agente de servicio al cliente", anios: 2, hab: ["atención al cliente", "cobros", "excel", "inglés"], salario: 750, mod: "remoto", disp: "Inmediata", bio: "Dos años en call center bilingüe. Busco trabajo remoto desde La Chorrera.", aplica: [19, 9], super: 19 },
  { email: "andres.pineda.demo@example.com", nombre: "Andrés Pineda", provincia: "Chiriquí", tel: "+507 6100-1010", titulo: "Supervisor de retail", anios: 5, hab: ["liderazgo", "ventas", "inventario", "excel"], salario: 1250, mod: "presencial", disp: "1 mes", bio: "Supervisé tienda de conveniencia en Boquete con equipo de 10 personas.", aplica: [2, 1, 18], super: 2 },
] as const;

async function idsExistentes() {
  const mapa = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    data.users.forEach((u) => u.email && mapa.set(u.email, u.id));
    if (data.users.length < 1000) break;
  }
  return mapa;
}

async function asegurarUsuario(existentes: Map<string, string>, email: string, nombre: string) {
  const id = existentes.get(email);
  if (id) return id;
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: CLAVE,
    email_confirm: true,
    user_metadata: { full_name: nombre },
  });
  if (error) throw new Error(`${email}: ${error.message}`);
  return data.user.id;
}

async function ok<T>(p: PromiseLike<{ error: { message: string } | null; data?: T | null }>, que: string) {
  const { error, data } = await p;
  if (error) throw new Error(`${que}: ${error.message}`);
  return data as T;
}

async function consentir(userId: string) {
  const { data } = await db.from("consentimientos").select("id").eq("user_id", userId).eq("version", VERSION_CONSENTIMIENTO).maybeSingle();
  if (!data) await ok(db.from("consentimientos").insert({ user_id: userId, tipo: "datos_personales", version: VERSION_CONSENTIMIENTO }), "consentimiento");
}

async function main() {
  const existentes = await idsExistentes();

  // Empresas
  const empresaId = new Map<string, string>();
  for (const e of EMPRESAS) {
    const uid = await asegurarUsuario(existentes, e.email, e.persona);
    await ok(db.from("profiles").update({ rol: "empresa", nombre: e.persona, provincia: e.provincia, onboarding_completo: true }).eq("id", uid), "perfil empresa");
    await ok(db.from("contactos_privados").update({ telefono: e.tel }).eq("user_id", uid), "contacto empresa");
    await consentir(uid);
    const c = await ok<{ id: string }>(
      db.from("companies").upsert({ owner_id: uid, nombre: e.nombre, sector: e.sector, provincia: e.provincia, verificada: true }, { onConflict: "owner_id" }).select("id").single(),
      "empresa",
    );
    empresaId.set(e.clave, c.id);
    console.log("✔ empresa", e.nombre);
  }

  // Vacantes (se recrean para que el script se pueda correr varias veces)
  await ok(db.from("jobs").delete().in("company_id", [...empresaId.values()]), "limpiar vacantes");
  const jobs = await ok<{ id: string }[]>(
    db
      .from("jobs")
      .insert(
        VACANTES.map((v) => ({
          company_id: empresaId.get(v.empresa),
          titulo: v.titulo,
          descripcion: v.descripcion,
          salario_min: v.min,
          salario_max: v.max,
          modalidad: v.modalidad,
          provincia: v.provincia,
          ciudad: v.ciudad,
          tipo_contrato: v.contrato,
          habilidades: v.habilidades,
        })),
      )
      .select("id"),
    "vacantes",
  );
  console.log(`✔ ${jobs.length} vacantes`);

  // Candidatos y sus postulaciones
  for (const c of CANDIDATOS) {
    const uid = await asegurarUsuario(existentes, c.email, c.nombre);
    await ok(db.from("profiles").update({ rol: "candidato", nombre: c.nombre, provincia: c.provincia, onboarding_completo: true }).eq("id", uid), "perfil candidato");
    await ok(db.from("contactos_privados").update({ telefono: c.tel }).eq("user_id", uid), "contacto candidato");
    await consentir(uid);
    await ok(
      db.from("candidate_profiles").upsert(
        { user_id: uid, titulo: c.titulo, anios_experiencia: c.anios, habilidades: [...c.hab], salario_esperado: c.salario, modalidad: c.mod, disponibilidad: c.disp, bio: c.bio },
        { onConflict: "user_id" },
      ),
      "perfil profesional",
    );
    const swipes = c.aplica.map((i) => ({ candidate_id: uid, job_id: jobs[i].id, direccion: i === c.super ? "super" : "right" }));
    await ok(db.from("candidate_swipes").insert(swipes), "postulaciones");
    console.log("✔ candidato", c.nombre, `(${swipes.length} postulaciones)`);
  }

  console.log(`\nListo. Contraseña de todas las cuentas demo: ${CLAVE}`);
  console.log("Empresa demo:   ", EMPRESAS[0].email, "→ tiene postulantes en Cajero/a y Supervisor/a");
  console.log("Candidata demo: ", CANDIDATOS[0].email);
}

main().catch((e) => {
  console.error("✘", e.message);
  process.exit(1);
});
