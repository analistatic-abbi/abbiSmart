import { EstadoProceso } from '../models/proceso.model';

/** Clase CSS para badge de estado de proceso (paleta unificada). */
export function claseBadgeEstadoProceso(estado: EstadoProceso | string): string {
  const map: Record<string, string> = {
    [EstadoProceso.PorValidar]: 'estado-badge estado-badge--por-validar',
    [EstadoProceso.EnProceso]: 'estado-badge estado-badge--en-proceso',
    [EstadoProceso.Descartado]: 'estado-badge estado-badge--descartado',
    [EstadoProceso.EnValidacion]: 'estado-badge estado-badge--en-validacion',
    [EstadoProceso.Presentado]: 'estado-badge estado-badge--presentado',
    [EstadoProceso.Subsanacion]: 'estado-badge estado-badge--subsanacion',
    [EstadoProceso.Adjudicado]: 'estado-badge estado-badge--adjudicado',
    [EstadoProceso.Cerrado]: 'estado-badge estado-badge--cerrado-proceso',
  };
  return map[estado] ?? 'estado-badge';
}
