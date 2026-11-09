import "server-only";

/**
 * Interfaz común para pasarelas de pago. Para conectar una real (Yappy, Tilopay,
 * PagueloFacil, Paddle…) crea un archivo que implemente ProveedorPago y regístralo abajo.
 * Nada se cobra mientras config_app.pagos_activos = false o PAGOS_PROVEEDOR esté vacío.
 */
export type DatosCheckout = {
  pagoId: string;
  montoCentavos: number;
  moneda: string;
  descripcion: string;
  urlExito: string;
  urlCancelar: string;
};

export type ResultadoWebhook = { referencia: string; estado: "pagado" | "fallido" } | null;

export interface ProveedorPago {
  id: string;
  /** Crea la sesión de pago y devuelve la URL a la que se redirige a la empresa. */
  crearCheckout(d: DatosCheckout): Promise<{ url: string; referencia: string }>;
  /** Verifica la firma del webhook y extrae la referencia y el estado. null si no es válido. */
  verificarWebhook(request: Request): Promise<ResultadoWebhook>;
}

// Proveedor de desarrollo: no cobra nada. Bloqueado en producción.
const simulado: ProveedorPago = {
  id: "simulado",
  async crearCheckout(d) {
    return { url: `/empresa/planes/simulado?pago=${d.pagoId}`, referencia: `sim_${d.pagoId}` };
  },
  async verificarWebhook() {
    return null; // se confirma desde /api/pagos/simulado
  },
};

const PROVEEDORES: Record<string, ProveedorPago> = {
  simulado,
  // yappy: proveedorYappy,   ← implementar con la documentación del Botón de Pago Yappy
  // tilopay: proveedorTilopay,
};

export function proveedorActivo(): ProveedorPago | null {
  const id = process.env.PAGOS_PROVEEDOR;
  if (!id) return null;
  if (id === "simulado" && process.env.NODE_ENV === "production" && process.env.PAGOS_PERMITIR_SIMULADO !== "1") return null;
  return PROVEEDORES[id] ?? null;
}

export function proveedorPorId(id: string) {
  return PROVEEDORES[id] ?? null;
}
