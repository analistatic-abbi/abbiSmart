export enum EstadoKamRonda {
  Pendiente = 'Pendiente',
  Ejecutado = 'Ejecutado',
  Socializado = 'Socializado',
}

export interface KamListItem {
  id: number;
  procesoId: number;
  procesoCodigo: string | null;
  procesoIdDigitado: string;
  procesoObjeto: string | null;
  empresaMostrar: string;
  rondaActualNumero: number | null;
  rondaActualEstado: EstadoKamRonda | null;
  fechaReunionSocializacion: string | null;
}

export interface ResumenSeccion {
  seccionId: number;
  orden: number;
  titulo: string;
  puntosObtenidos: number;
  puntosPosibles: number;
  porcentaje: number | null;
  etiqueta: string;
}

export interface ResumenEncuesta {
  secciones: ResumenSeccion[];
  puntosObtenidos: number;
  puntosPosibles: number;
  porcentajeGlobal: number | null;
  categoria: string;
  veredictoSugerido: string;
}

export interface KamEncuestaRespuesta {
  itemId: number;
  /** @deprecated compat */
  preguntaId?: number;
  puntaje: number | null;
  observacion: string | null;
}

export interface KamEncuestaContacto {
  contactoId: number;
  nombre: string;
  completo: boolean;
  respuestas: KamEncuestaRespuesta[];
  resumen?: ResumenEncuesta;
}

export interface KamEncuesta {
  id: number;
  formatoEncuestaId: number;
  formatoNombre: string;
  fechaCreacion: string;
  veredicto: string | null;
  veredictoEditado: boolean;
  resumen: ResumenEncuesta | null;
  contactos: KamEncuestaContacto[];
}

export interface KamCorrespondenciaArchivo {
  id: number;
  nombre: string;
  url: string;
}

export interface KamBitacoraEntrada {
  id: number;
  rondaId: number;
  usuarioId: number;
  usuarioNombre: string;
  texto: string;
  fechaCreacion: string;
}

export interface KamRonda {
  id: number;
  numero: number;
  estado: EstadoKamRonda;
  fechaReunionSocializacion: string | null;
  /** @deprecated usar bitacoraEntradas */
  bitacora: string | null;
  bitacoraEntradas?: KamBitacoraEntrada[];
  veredicto: string | null;
  veredictoEditado: boolean;
  resumen: ResumenEncuesta | null;
  correspondencias?: KamCorrespondenciaArchivo[];
  correspondenciaNombre: string | null;
  correspondenciaUrl: string | null;
  ejecutadoManual: boolean;
  fechaSocializado: string | null;
  encuestas: KamEncuesta[];
}

export interface KamContactoProceso {
  contactoId: number;
  nombre: string;
  cargo: string | null;
  correo: string | null;
}

export interface KamDetail {
  id: number;
  procesoId: number;
  paisId: number;
  empresaClienteId: number;
  fechaCreacion: string;
  creadoPorId: number | null;
  procesoCodigo: string | null;
  procesoIdDigitado: string;
  procesoObjeto: string | null;
  empresaMostrar: string;
  contactosProceso: KamContactoProceso[];
  rondas: KamRonda[];
}

export interface KamCalendarioEvento {
  kamId: number;
  rondaId: number;
  procesoCodigo: string | null;
  procesoObjeto: string | null;
  empresaMostrar: string;
  tipo: 'reunion';
  fecha: string;
  estado: EstadoKamRonda;
  diasRestantes: number;
}

export interface KamListQuery {
  search?: string;
  empresaClienteId?: number;
  estadoRonda?: EstadoKamRonda;
  sinReunionAgendada?: boolean;
  page?: number;
  limit?: number;
}

export interface CrearEncuestaPayload {
  formatoEncuestaId: number;
  contactoId: number;
}

export interface RespuestaEncuestaItem {
  itemId: number;
  puntaje?: number | null;
  observacion?: string;
}

export interface GuardarRespuestasPayload {
  contactoId: number;
  respuestas: RespuestaEncuestaItem[];
}

export interface UpdateVeredictoPayload {
  veredicto: string;
}
