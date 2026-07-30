export enum SegmentoCliente {
  AcabadosConstruccion = 'Acabados de Construcción',
  ActividadesOrganizaciones = 'Actividades de Organizaciones Profesionales',
  Construccion = 'Construcción',
  ConsultoriasServicios = 'Consultorías y Servicios',
  EnergiaElectrica = 'Energía Eléctrica',
  EnergiaRenovable = 'Energía Renovable',
  GasNatural = 'Gas Natural',
  Hidrocarburos = 'Hidrocarburos',
  Manufactura = 'Manufactura',
  Mineria = 'Minería',
  ServiciosPetroleros = 'Servicios Petroleros',
  Otro = 'Otro',
}

export enum CanalRelacionamiento {
  Correo = 'Correo',
  Llamada = 'Llamada',
  Mensaje = 'Mensaje',
  Presencial = 'Presencial',
}

export enum ResultadoRelacionamiento {
  ReunionProgramada = 'Reunión programada',
  ReferidoTercero = 'Referido a tercero',
  Ninguno = 'Ninguno',
}

export interface Cliente {
  id: number;
  empresa: string;
  paisId: number;
  ubicacionId: number;
  segmento: SegmentoCliente;
  segmentoOtro: string | null;
  fechaCreacion: string;
}

export interface ClienteListItem {
  id: number;
  empresa: string;
  segmento: SegmentoCliente;
  fechaCreacion: string;
}

export interface CreateClientePayload {
  empresa: string;
  ubicacionId: number;
  segmento: SegmentoCliente;
  segmentoOtro?: string;
}

export interface Contacto {
  id: number;
  clienteId: number;
  nombre: string;
  cargo: string | null;
  telefono: string | null;
  correo: string | null;
  ubicacionId: number;
  esGenerico: boolean;
  referidoPorContactoId: number | null;
  fechaCreacion: string;
}

export interface CreateContactoPayload {
  nombre: string;
  ubicacionId: number;
  cargo?: string;
  telefono?: string;
  correo?: string;
  referidoPorContactoId?: number;
}

export interface Relacionamiento {
  id: number;
  contactoId: number;
  emisorUsuarioId: number;
  canal: CanalRelacionamiento;
  mensaje: string;
  fechaMensaje: string;
  diasEsperaRespuesta: number;
  respuesta: string | null;
  fechaRespuesta: string | null;
  resultado: ResultadoRelacionamiento;
  fechaReunion: string | null;
}

export interface RelacionamientoVencido extends Relacionamiento {
  fechaLimiteRespuesta: string;
}

export interface ContactoReferidoPayload {
  nombre: string;
  cargo?: string;
  telefono?: string;
  correo?: string;
  ubicacionId?: number;
}

export interface CreateRelacionamientoPayload {
  contactoId: number;
  canal: CanalRelacionamiento;
  mensaje: string;
  fechaMensaje: string;
  diasEsperaRespuesta?: number;
  resultado: ResultadoRelacionamiento;
  fechaReunion?: string;
  contactoReferido?: ContactoReferidoPayload;
}
