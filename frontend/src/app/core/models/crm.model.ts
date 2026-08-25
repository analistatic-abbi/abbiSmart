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
  segmento: string;
  segmentoOtro: string | null;
  fechaCreacion: string;
}

export interface ClienteVista360Resumen {
  procesosActivos: number;
  cuantiaTotal: string;
  proyeccionesAbiertas: number;
  relacionamientosVencidos: number;
  totalContactos: number;
}

export interface ClienteVista360Proceso {
  id: number;
  codigo: string | null;
  idDigitado: string;
  estado: string;
  cuantia: string;
  moneda: string;
  fechaCierre: string | null;
}

export interface ClienteVista360Proyeccion {
  id: number;
  anioProyectado: number;
  estado: string;
  mercado: string | null;
  valorVenta: string;
  valorFacturacion: string;
  fechaEstimadaPublicacion: string;
}

export interface ClienteVista360Relacionamiento {
  id: number;
  contactoNombre: string;
  canal: string;
  fechaMensaje: string;
  resultado: string | null;
  vencido: boolean;
}

export interface ClienteVista360 {
  cliente: Cliente;
  ubicacionLabel: string | null;
  resumen: ClienteVista360Resumen;
  procesos: ClienteVista360Proceso[];
  proyecciones: ClienteVista360Proyeccion[];
  relacionamientos: ClienteVista360Relacionamiento[];
}

export interface ClienteListItem {
  id: number;
  empresa: string;
  segmento: string;
  fechaCreacion: string;
}

export interface CreateClientePayload {
  empresa: string;
  ubicacionId: number;
  segmento: string;
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
  referidoPorNombre: string | null;
  esReferido: boolean;
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
  fechaAlertaRespuesta: string;
  respuesta: string | null;
  fechaRespuesta: string | null;
  resultado: ResultadoRelacionamiento;
  fechaReunion: string | null;
  contactoReferidoId: number | null;
  contactoReferidoNombre: string | null;
}

export interface RelacionamientoVencido extends Relacionamiento {
  fechaLimiteRespuesta: string;
  clienteId?: number;
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
  fechaAlertaRespuesta: string;
  resultado?: ResultadoRelacionamiento;
  fechaReunion?: string;
  contactoReferido?: ContactoReferidoPayload;
}

export interface UpdateRelacionamientoPayload {
  canal?: CanalRelacionamiento;
  mensaje?: string;
  fechaMensaje?: string;
  respuesta?: string;
  fechaRespuesta?: string;
  resultado?: ResultadoRelacionamiento;
  fechaReunion?: string;
  contactoReferido?: ContactoReferidoPayload;
}
