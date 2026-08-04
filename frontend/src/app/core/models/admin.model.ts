import { Proceso, ProcesoTarea } from './proceso.model';
import { Rol } from './rol.enum';

export enum EstadoProyeccion {
  Lejano = 'Lejano',
  Proximo = 'Proximo',
  SaleEsteMes = 'Sale este mes',
  Publicado = 'Publicado',
  Cerrado = 'Cerrado',
}

export enum MercadoProyeccion {
  General = 'General',
  Objetivo = 'Objetivo',
}

export interface Proyeccion {
  id: number;
  procesoOrigenId: number | null;
  procesoResultanteId: number | null;
  procesoCodigo?: string | null;
  procesoOrigenCodigo?: string | null;
  procesoResultanteCodigo?: string | null;
  proyeccionSiguienteId?: number | null;
  empresa?: string | null;
  empresaClienteId?: number | null;
  empresaOtro?: string | null;
  segmento?: string | null;
  objeto?: string | null;
  anioProyectado: number;
  fechaEstimadaPublicacion: string;
  valorVenta: string;
  valorFacturacion: string;
  estado: EstadoProyeccion;
  mercado: string | null;
  diasFaltantes?: number;
}

export interface CreateProyeccionPayload {
  procesoOrigenId?: number;
  anioProyectado: number;
  fechaEstimadaPublicacion: string;
  valorVenta: number;
  valorFacturacion: number;
  empresaClienteId?: number;
  empresaOtro?: string;
  segmento?: string;
  objeto?: string;
}

export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
  estado: string;
  paisId: number | null;
  paisNombre?: string | null;
  fechaCreacion: string;
}

export interface CreateUsuarioPayload {
  nombre: string;
  correo: string;
  rol: Rol;
  paisId: number;
}

export interface ConfiguracionItem {
  clave: string;
  valor: string;
  descripcion: string;
}

export interface AuditLog {
  id: number;
  usuarioId: number | null;
  usuarioNombre: string | null;
  accion: string;
  accionLabel: string;
  entidadTipo: string;
  entidadId: number | null;
  entidadLabel: string;
  campo: string | null;
  valorAnterior: string | null;
  valorNuevo: string | null;
  detalle: string | null;
  fechaHora: string;
}

export interface ValidacionPendiente {
  validacionId: number;
  procesoId: number;
  codigo: string | null;
  empresaMostrar: string;
  estado: string;
  validadorNombre?: string;
}

export interface ValidacionRevision {
  proceso: Proceso;
  tareas: ProcesoTarea[];
}

export interface SolicitudEliminacion {
  id: number;
  entidadTipo: string;
  entidadId: number;
  motivo: string;
  estado: string;
  fechaSolicitud: string;
}

export interface EfectividadMercadoMercado {
  total: number;
  pendientes: number;
  resueltas: number;
  nuncaMaterializadas: number;
  materializadasNoGanadas: number;
  ganadas: number;
  materializadas: number;
  pctNuncaMaterializadas: number | null;
  pctMaterializadasNoGanadas: number | null;
  pctGanadas: number | null;
  pctGanadasDeMaterializadas: number | null;
}

export interface EfectividadMercadoReporte {
  anio: number;
  sinMercado: number;
  inconsistencias: number;
  general: EfectividadMercadoMercado;
  objetivo: EfectividadMercadoMercado;
}
