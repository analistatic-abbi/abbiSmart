import { Notificacion } from '../services/notificaciones.service';

function coerceEntidadId(n: Notificacion): number | null {
  const raw = n.entidadId;
  if (raw !== null && raw !== undefined && `${raw}`.trim() !== '') {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  const match = n.mensaje.match(/#(\d+)/);
  if (!match) {
    return null;
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function resolverRutaNotificacion(n: Notificacion): string[] | null {
  const entidadId = coerceEntidadId(n);
  const entidadTipo = (n.entidadTipo ?? '').trim().toLowerCase();
  const tipo = (n.tipo ?? '').trim().toLowerCase();

  if (
    entidadId &&
    (entidadTipo === 'proyeccion' || tipo.startsWith('proyeccion_'))
  ) {
    return ['/proyecciones', String(entidadId)];
  }

  if (entidadId && (entidadTipo === 'proceso' || tipo.startsWith('proceso_'))) {
    return ['/procesos', String(entidadId)];
  }

  if (entidadTipo === 'dashboard' || tipo === 'reporte_mensual_disponible') {
    return ['/dashboard'];
  }

  return null;
}
