import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacidad" };

// Borrador: debe revisarlo un abogado panameño antes del lanzamiento público.
export default function Privacidad() {
  return (
    <main className="mx-auto max-w-md px-5 py-8 text-[15px] leading-relaxed text-zinc-700">
      <Link href="/" className="text-sm font-semibold text-rose-600">
        ← Volver
      </Link>
      <h1 className="mt-4 text-3xl font-black text-zinc-900">Política de privacidad</h1>
      <p className="mt-1 text-sm text-zinc-500">Versión 2026-11-v1 · Ley 81 de 2019 de la República de Panamá</p>

      <h2 className="mt-6 text-lg font-bold text-zinc-900">Responsable</h2>
      <p>ChambaMatch (nombre provisional), plataforma de intermediación de empleo en Panamá.</p>

      <h2 className="mt-6 text-lg font-bold text-zinc-900">Datos que tratamos</h2>
      <p>
        Identificación (nombre, foto), contacto (correo, teléfono), perfil profesional (puesto, experiencia, habilidades,
        salario esperado, CV) y actividad en la app (postulaciones, matches y mensajes).
      </p>

      <h2 className="mt-6 text-lg font-bold text-zinc-900">Finalidad</h2>
      <p>
        Conectar candidatos con empresas: mostrar vacantes y postulantes, crear matches y permitir la comunicación entre
        ambas partes. No vendemos ni cedemos tus datos con fines comerciales.
      </p>

      <h2 className="mt-6 text-lg font-bold text-zinc-900">Quién ve qué</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Tu perfil profesional solo lo ven las empresas a cuyas vacantes te postulas.</li>
        <li>Tu teléfono, correo y CV solo los ven las personas con quienes tienes match.</li>
        <li>Si descartas una vacante, la empresa nunca se entera.</li>
        <li>Los mensajes del chat solo los leen los dos participantes del match.</li>
      </ul>

      <h2 className="mt-6 text-lg font-bold text-zinc-900">Encargados del tratamiento</h2>
      <p>
        Supabase (base de datos, autenticación y archivos) y Vercel (alojamiento web). En la fase de entrevistas con IA se
        pedirá un consentimiento aparte.
      </p>

      <h2 className="mt-6 text-lg font-bold text-zinc-900">Tus derechos (ARCO)</h2>
      <p>
        Puedes acceder, rectificar, cancelar y oponerte al tratamiento de tus datos, así como solicitar su portabilidad y
        revocar tu consentimiento en cualquier momento desde tu Perfil o escribiendo al correo de soporte.
      </p>

      <h2 className="mt-6 text-lg font-bold text-zinc-900">Conservación</h2>
      <p>Mientras tu cuenta esté activa. Al borrarla eliminamos tu perfil, postulaciones, matches y mensajes.</p>
    </main>
  );
}
