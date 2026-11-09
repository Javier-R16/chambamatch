import { BadgeCheck, Briefcase, Clock, MapPin, Star, Wallet } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { etiquetaContrato, etiquetaModalidad, formatoMonto, formatoSalario } from "@/lib/constantes";
import type { PostulanteFeed, VacanteFeed } from "@/lib/tipos";

function Chips({ habilidades, resaltar }: { habilidades: string[]; resaltar: string[] }) {
  const set = new Set(resaltar.map((h) => h.trim().toLowerCase()));
  return (
    <div className="flex flex-wrap gap-1.5">
      {habilidades.map((h) => {
        const coincide = set.has(h.trim().toLowerCase());
        return (
          <span
            key={h}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              coincide ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300" : "bg-zinc-100 text-zinc-700"
            }`}
          >
            {coincide && "✓ "}
            {h}
          </span>
        );
      })}
    </div>
  );
}

function Dato({ icono: Icono, children }: { icono: typeof MapPin; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-zinc-600">
      <Icono className="size-4 shrink-0 text-zinc-400" />
      {children}
    </span>
  );
}

export function TarjetaVacante({ v, misHabilidades }: { v: VacanteFeed; misHabilidades: string[] }) {
  return (
    <div className="flex h-full flex-col">
      <div className="relative bg-gradient-to-br from-orange-50 to-rose-50 p-5">
        {v.destacada && (
          <span className="absolute right-4 top-4 rounded-full bg-amber-400 px-2.5 py-1 text-xs font-bold text-amber-950 shadow-sm">
            ⭐ Destacada
          </span>
        )}
        <div className="flex items-center gap-3">
          <Avatar src={v.empresa_logo} nombre={v.empresa_nombre} cuadrado className="size-14 text-lg" />
          <div className="min-w-0">
            <p className="flex items-center gap-1 truncate font-semibold text-zinc-800">
              {v.empresa_nombre}
              {v.empresa_verificada && <BadgeCheck className="size-4 shrink-0 text-sky-500" aria-label="Verificada" />}
            </p>
            {v.empresa_sector && <p className="truncate text-sm text-zinc-500">{v.empresa_sector}</p>}
          </div>
        </div>
        <h2 className="mt-4 text-2xl font-bold leading-tight text-zinc-900">{v.titulo}</h2>
        <p className="mt-1 text-lg font-semibold text-emerald-700">
          {formatoSalario(v.salario_min, v.salario_max)}
          {(v.salario_min || v.salario_max) && <span className="text-sm font-normal text-zinc-500"> /mes</span>}
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-hidden p-5">
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <Dato icono={MapPin}>{[v.ciudad, v.provincia].filter(Boolean).join(", ")}</Dato>
          <Dato icono={Briefcase}>{etiquetaModalidad(v.modalidad)}</Dato>
          <Dato icono={Clock}>{etiquetaContrato(v.tipo_contrato)}</Dato>
        </div>
        <p className="line-clamp-6 text-[15px] leading-relaxed text-zinc-700">{v.descripcion}</p>
        {v.habilidades.length > 0 && (
          <div className="mt-auto space-y-2">
            {v.coincidencias > 0 && (
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Cumples {v.coincidencias} de {v.habilidades.length} habilidades
              </p>
            )}
            <Chips habilidades={v.habilidades} resaltar={misHabilidades} />
          </div>
        )}
      </div>
    </div>
  );
}

export function TarjetaPostulante({ p, habilidadesVacante }: { p: PostulanteFeed; habilidadesVacante: string[] }) {
  return (
    <div className="flex h-full flex-col">
      <div className="relative bg-gradient-to-br from-sky-50 to-indigo-50 p-5">
        {p.es_super && (
          <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-sky-500 px-2.5 py-1 text-xs font-bold text-white shadow">
            <Star className="size-3.5" fill="currentColor" /> Súper Chamba
          </span>
        )}
        <Avatar src={p.foto_url} nombre={p.nombre} className="size-20 text-2xl" />
        <h2 className="mt-3 text-2xl font-bold leading-tight text-zinc-900">{p.nombre}</h2>
        <p className="text-lg font-medium text-zinc-700">{p.titulo}</p>
      </div>
      <div className="flex flex-1 flex-col gap-4 overflow-hidden p-5">
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {p.provincia && <Dato icono={MapPin}>{p.provincia}</Dato>}
          <Dato icono={Briefcase}>
            {p.anios_experiencia} {p.anios_experiencia === 1 ? "año" : "años"} de experiencia
          </Dato>
          <Dato icono={Wallet}>{formatoMonto(p.salario_esperado)}</Dato>
          {p.modalidad && <Dato icono={Clock}>{etiquetaModalidad(p.modalidad)}</Dato>}
        </div>
        {p.disponibilidad && (
          <p className="text-sm text-zinc-600">
            <b>Disponibilidad:</b> {p.disponibilidad}
          </p>
        )}
        {p.bio && <p className="line-clamp-5 text-[15px] leading-relaxed text-zinc-700">{p.bio}</p>}
        {p.habilidades.length > 0 && (
          <div className="mt-auto space-y-2">
            {p.coincidencias > 0 && (
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                {p.coincidencias} habilidades en común con la vacante
              </p>
            )}
            <Chips habilidades={p.habilidades} resaltar={habilidadesVacante} />
          </div>
        )}
        <p className="text-xs text-zinc-400">Teléfono, correo y CV se muestran cuando hay match.</p>
      </div>
    </div>
  );
}
