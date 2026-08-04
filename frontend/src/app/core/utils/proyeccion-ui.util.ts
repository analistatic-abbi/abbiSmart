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
    proceso_validacion_correccion: 'Proceso devuelto por validación',
    proceso_cierre_proximo: 'Cierre de proceso próximo',
    proceso_cierre_urgente: 'Cierre de proceso urgente',
    relacionamiento_vencido: 'Relacionamiento vencido',
    reporte_mensual_disponible: 'Reporte mensual disponible',
  };
  return map[tipo] ?? tipo;
}
