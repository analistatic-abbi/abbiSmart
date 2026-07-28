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
  usuarioId: number;
  accion: string;
  entidadTipo: string;
  entidadId: number | null;
  valorAnterior: string | null;
  valorNuevo: string | null;
  fecha: string;
}

export interface ValidacionPendiente {
  validacionId: number;
  procesoId: number;
  codigo: string | null;
  empresaMostrar: string;
  estado: string;
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
