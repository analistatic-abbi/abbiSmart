import { IndicadorCodigo } from '../models/proceso.model';
import { formatParametroValor } from './parametro.util';

export interface ParametroHistorialCambio {
  label: string;
  texto: string;
}

interface ParametroSnapshot {
  indicadorCodigo?: string;
  anio?: number | string;
  valor?: string | number;
  reglaCumplimiento?: string;
}

const CAMPOS_HISTORIAL: Array<keyof ParametroSnapshot> = [
  'valor',
  'reglaCumplimiento',
  'anio',
];

const ETIQUETAS_CAMPO: Record<keyof ParametroSnapshot, string> = {
  indicadorCodigo: 'Indicador',
  valor: 'Valor',
  reglaCumplimiento: 'Regla de cumplimiento',
  anio: 'Año',
};

function parseSnapshot(raw: string | Record<string, unknown> | null | undefined): ParametroSnapshot | null {
  if (raw === null || raw === undefined) {
    return null;
  }

  if (typeof raw === 'object') {
    return raw as ParametroSnapshot;
  }

  if (!raw.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ParametroSnapshot;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function resolveIndicador(
  snapshot: ParametroSnapshot | null,
  fallback: string,
): string {
  const codigo = snapshot?.indicadorCodigo;
  if (codigo) {
    return codigo;
  }

  return fallback;
}

function formatCampo(
  campo: keyof ParametroSnapshot,
  value: unknown,
  indicador: string,
): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (campo === 'valor') {
    return formatParametroValor(indicador, value as string | number);
  }

  return String(value);
}

export function buildParametroHistorialCambios(
  item: {
    valorAnterior?: string | Record<string, unknown> | null;
    valorNuevo?: string | Record<string, unknown> | null;
    detalle?: string | null;
    accion?: string;
  },
  indicadorFallback: string,
): ParametroHistorialCambio[] {
  const anterior = parseSnapshot(item.valorAnterior ?? null);
  const nuevo = parseSnapshot(item.valorNuevo ?? null);

  if (anterior && nuevo) {
    const indicador = resolveIndicador(nuevo, resolveIndicador(anterior, indicadorFallback));
    const cambios: ParametroHistorialCambio[] = [];

    for (const campo of CAMPOS_HISTORIAL) {
      const valorAnterior = anterior[campo];
      const valorNuevo = nuevo[campo];

      if (String(valorAnterior ?? '') === String(valorNuevo ?? '')) {
        continue;
      }

      cambios.push({
        label: ETIQUETAS_CAMPO[campo],
        texto: `${formatCampo(campo, valorAnterior, indicador)} → ${formatCampo(campo, valorNuevo, indicador)}`,
      });
    }

    if (cambios.length) {
      return cambios;
    }

    return [{ label: 'Cambio', texto: 'Se actualizó el parámetro sin variación en valor, regla o año.' }];
  }

  if (nuevo && !anterior) {
    const indicador = resolveIndicador(nuevo, indicadorFallback);
    return CAMPOS_HISTORIAL.map((campo) => ({
      label: ETIQUETAS_CAMPO[campo],
      texto: formatCampo(campo, nuevo[campo], indicador),
    })).filter((item) => item.texto !== '—');
  }

  if (anterior && !nuevo) {
    const indicador = resolveIndicador(anterior, indicadorFallback);
    return [
      {
        label: 'Valor eliminado',
        texto: formatCampo('valor', anterior.valor, indicador),
      },
    ];
  }

  if (item.valorAnterior || item.valorNuevo) {
    const anteriorTexto =
      typeof item.valorAnterior === 'string'
        ? item.valorAnterior
        : item.valorAnterior
          ? JSON.stringify(item.valorAnterior)
          : '—';
    const nuevoTexto =
      typeof item.valorNuevo === 'string'
        ? item.valorNuevo
        : item.valorNuevo
          ? JSON.stringify(item.valorNuevo)
          : '—';

    return [
      {
        label: 'Cambio',
        texto: `${anteriorTexto} → ${nuevoTexto}`,
      },
    ];
  }

  if (item.detalle?.trim()) {
    return [{ label: 'Detalle', texto: item.detalle.trim() }];
  }

  return [{ label: 'Registro', texto: 'Sin detalle disponible.' }];
}

export function accionHistorialLabel(accion: string | undefined, accionLabel?: string | null): string {
  if (accionLabel?.trim()) {
    return accionLabel.trim();
  }

  return accion?.replaceAll('_', ' ') ?? 'Cambio registrado';
}
