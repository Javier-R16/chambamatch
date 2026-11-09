export type Rol = "candidato" | "empresa";
export type Modalidad = "presencial" | "remoto" | "hibrido";
export type Direccion = "left" | "right" | "super";
export type TipoContrato = "indefinido" | "temporal" | "por_obra" | "medio_tiempo" | "pasantia" | "freelance";

export type Perfil = {
  id: string;
  rol: Rol | null;
  nombre: string;
  foto_url: string | null;
  provincia: string | null;
  onboarding_completo: boolean;
};

export type PerfilCandidato = {
  user_id: string;
  titulo: string;
  anios_experiencia: number;
  habilidades: string[];
  salario_esperado: number | null;
  modalidad: Modalidad | null;
  disponibilidad: string | null;
  bio: string | null;
  cv_url: string | null;
};

export type Empresa = {
  id: string;
  owner_id: string;
  nombre: string;
  logo_url: string | null;
  sector: string | null;
  provincia: string | null;
  verificada: boolean;
};

export type Vacante = {
  id: string;
  company_id: string;
  titulo: string;
  descripcion: string;
  salario_min: number | null;
  salario_max: number | null;
  modalidad: Modalidad;
  provincia: string;
  ciudad: string | null;
  tipo_contrato: TipoContrato;
  habilidades: string[];
  activa: boolean;
  destacada_hasta: string | null;
  creado_en: string;
};

// Fila de feed_candidato()
export type VacanteFeed = Omit<Vacante, "company_id" | "activa" | "destacada_hasta"> & {
  destacada?: boolean;
  empresa_nombre: string;
  empresa_logo: string | null;
  empresa_sector: string | null;
  empresa_verificada: boolean;
  coincidencias: number;
};

// Fila de feed_empresa()
export type PostulanteFeed = {
  candidate_id: string;
  nombre: string;
  foto_url: string | null;
  provincia: string | null;
  titulo: string;
  anios_experiencia: number;
  habilidades: string[];
  salario_esperado: number | null;
  modalidad: Modalidad | null;
  disponibilidad: string | null;
  bio: string | null;
  es_super: boolean;
  coincidencias: number;
  postulado_en: string;
};

export type Mensaje = {
  id: string;
  match_id: string;
  sender_id: string;
  cuerpo: string;
  creado_en: string;
  leido_en: string | null;
};
