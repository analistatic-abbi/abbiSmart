import { AuditLog } from '../models/admin.model';
import { IndicadorCodigo } from '../models/proceso.model';
import { formatFechaHora } from './date.util';
import { formatParametroValor } from './parametro.util';
import {
  accionHistorialLabel,
  buildParametroHistorialCambios,
  ParametroHistorialCambio,
} from './parametro-historial.util';

export type { ParametroHistorialCambio as AuditHistorialCambio };

export interface AuditHistorialContext {
  indicador?: string;
}

const CAMPO_LABELS: Record<string, string> = {
  fechaApertura: 'Fecha apertura',
  fechaCierre: 'Fecha cierre',
  fechaManifestacionInteres: 'Manifestación de interés',
  fechaAdquisicionDerecho: 'Adquisición de derecho',
  fechaReunionAclaratoria: 'Reunión aclaratoria',
  fechaVisitaTecnica: 'Visita técnica',
  fechaSolicitudesAclaracion: 'Solicitudes de aclaración',
  fechaRespuestaAclaracion: 'Respuesta a aclaración',
  fechaLimitacionMypymes: 'Limitación MyPymes',
  valor: 'Valor',
  reglaCumplimiento: 'Regla de cumplimiento',
  anio: 'Año',
  estado: 'Estado',
  mercado: 'Mercado',
};

function labelCampo(campo: string | null | undefined): string | null {
  if (!campo?.trim()) {
    return null;
  }

  return CAMPO_LABELS[campo] ?? CAMPO_LABELS[campo.trim().toLowerCase()] ?? campo.replace(/_/g, ' ');
}

function formatValorCampo(
  value: string | null | undefined,
  campo?: string | null,
): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (campo?.startsWith('fecha') || /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return formatFechaHora(`${value}T12:00:00`).split(',')[0] ?? value;
  }

  return value;
}

function buildCampoHistorialCambios(
  item: AuditLog,
  context: AuditHistorialContext,
): ParametroHistorialCambio[] {
  const label = labelCampo(item.campo);
  if (!label) {
    return [];
  }

  if (item.campo === 'valor' && context.indicador) {
    const anterior = item.valorAnterior
      ? formatParametroValor(context.indicador, item.valorAnterior)
      : '—';
    const nuevo = item.valorNuevo
      ? formatParametroValor(context.indicador, item.valorNuevo)
      : '—';

    if (item.valorAnterior || item.valorNuevo) {
      return [{ label, texto: `${anterior} → ${nuevo}` }];
    }
  }

  const anterior = formatValorCampo(item.valorAnterior, item.campo);
  const nuevo = formatValorCampo(item.valorNuevo, item.campo);

  if (item.valorAnterior && item.valorNuevo) {
    return [{ label, texto: `${anterior} → ${nuevo}` }];
  }

  if (item.valorNuevo) {
    return [{ label, texto: nuevo }];
  }

  if (item.valorAnterior) {
    return [{ label, texto: anterior }];
  }

  return [];
}

export function buildAuditHistorialCambios(
  item: AuditLog,
  context: AuditHistorialContext = {},
): ParametroHistorialCambio[] {
  if (item.campo) {
    const porCampo = buildCampoHistorialCambios(item, context);
    if (porCampo.length) {
      return porCampo;
    }
  }

  if (context.indicador) {
    const parametroCambios = buildParametroHistorialCambios(item, context.indicador);
    if (
      parametroCambios.length !== 1
      || parametroCambios[0].texto !== 'Sin detalle disponible.'
    ) {
      return parametroCambios;
    }
  }

  if (item.detalle?.trim()) {
    return [{ label: 'Detalle', texto: item.detalle.trim() }];
  }

  return [{ label: 'Registro', texto: 'Sin detalle disponible.' }];
}

export { accionHistorialLabel };

export function historialUsuarioLabel(item: AuditLog): string {
  return item.usuarioNombre?.trim() || 'Sistema';
}
