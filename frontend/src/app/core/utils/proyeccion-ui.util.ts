import { EstadoProyeccion } from '../models/admin.model';

/** Clase CSS para badge de estado de proyección (paleta unificada). */
export function claseBadgeEstadoProyeccion(estado: EstadoProyeccion | string): string {
  const map: Record<string, string> = {
    [EstadoProyeccion.Lejano]: 'estado-badge estado-badge--lejano',
    [EstadoProyeccion.Proximo]: 'estado-badge estado-badge--proximo',
    [EstadoProyeccion.SaleEsteMes]: 'estado-badge estado-badge--sale',
    [EstadoProyeccion.Publicado]: 'estado-badge estado-badge--publicado',
    [EstadoProyeccion.Cerrado]: 'estado-badge estado-badge--cerrado',
  };
  return map[estado] ?? 'estado-badge';
}

export function etiquetaTipoNotificacion(tipo: string): string {
  const map: Record<string, string> = {
    proyeccion_creada_auto: 'Nueva proyección',
    proyeccion_proxima: 'Proyección próxima',
    proyeccion_sale_este_mes: 'Proyección sale este mes',
    proceso_validacion_correccion: 'Validación — correcciones',
  };
  return map[tipo] ?? tipo;
}
