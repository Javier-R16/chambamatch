import type { Modalidad, TipoContrato } from "./tipos";

export const PROVINCIAS = [
  "Bocas del Toro",
  "Coclé",
  "Colón",
  "Chiriquí",
  "Darién",
  "Herrera",
  "Los Santos",
  "Panamá",
  "Panamá Oeste",
  "Veraguas",
  "Comarca Guna Yala",
  "Comarca Emberá-Wounaan",
  "Comarca Ngäbe-Buglé",
  "Comarca Naso Tjër Di",
] as const;

export const MODALIDADES: { valor: Modalidad; etiqueta: string }[] = [
  { valor: "presencial", etiqueta: "Presencial" },
  { valor: "remoto", etiqueta: "Remoto" },
  { valor: "hibrido", etiqueta: "Híbrido" },
];

export const CONTRATOS: { valor: TipoContrato; etiqueta: string }[] = [
  { valor: "indefinido", etiqueta: "Indefinido" },
  { valor: "temporal", etiqueta: "Temporal" },
  { valor: "por_obra", etiqueta: "Por obra" },
  { valor: "medio_tiempo", etiqueta: "Medio tiempo" },
  { valor: "pasantia", etiqueta: "Pasantía" },
  { valor: "freelance", etiqueta: "Freelance" },
];

export const etiquetaModalidad = (m?: string | null) =>
  MODALIDADES.find((x) => x.valor === m)?.etiqueta ?? "";
export const etiquetaContrato = (c?: string | null) =>
  CONTRATOS.find((x) => x.valor === c)?.etiqueta ?? "";

// Versión del texto de consentimiento (Ley 81 de 2019). Cambiarla obliga a aceptar de nuevo.
export const VERSION_CONSENTIMIENTO = "2026-11-v1";

const fmt = new Intl.NumberFormat("es-PA", { maximumFractionDigits: 0 });
export function formatoSalario(min?: number | null, max?: number | null) {
  if (min && max) return `B/. ${fmt.format(min)} – ${fmt.format(max)}`;
  if (min) return `Desde B/. ${fmt.format(min)}`;
  if (max) return `Hasta B/. ${fmt.format(max)}`;
  return "Salario a convenir";
}
export const formatoMonto = (n?: number | null) => (n ? `B/. ${fmt.format(n)}` : "A convenir");

// Inicio del día de hoy en Panamá (UTC-5, sin horario de verano), en ISO
export function inicioDiaPanama() {
  const ahora = new Date(Date.now() - 5 * 3600_000);
  const inicio = Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()) + 5 * 3600_000;
  return new Date(inicio).toISOString();
}

export function iniciales(nombre?: string | null) {
  return (nombre ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
