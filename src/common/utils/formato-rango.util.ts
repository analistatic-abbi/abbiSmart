import { IndicadorCodigo } from '../enums/indicador-codigo.enum';

export interface RangoImportRow {
  excelRow: number;
  indicadorCodigo: IndicadorCodigo;
  rangoMin: number | null;
  rangoMax: number | null;
  puntos: number;
}

export interface RangoValidado extends RangoImportRow {
  orden: number;
}

export interface RangoEvaluacion {
  id?: number;
  orden: number;
  rangoMin: number | null;
  rangoMax: number | null;
  puntos: number;
}

export function parseCeldaNumerica(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.replace(/\s/g, '').replace(',', '.');
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

export function valorEnRango(
  valor: number,
  rangoMin: number | null,
  rangoMax: number | null,
): boolean {
  if (rangoMax === null) {
    return rangoMin !== null && valor >= rangoMin;
  }

  if (rangoMin === null) {
    return valor < rangoMax;
  }

  return valor >= rangoMin && valor < rangoMax;
}

export function findRangoParaValor(
  rangos: RangoEvaluacion[],
  valor: number,
): RangoEvaluacion | null {
  const matches = rangos.filter((rango) =>
    valorEnRango(valor, rango.rangoMin, rango.rangoMax),
  );

  if (matches.length !== 1) {
    return null;
  }

  return matches[0]!;
}

function sortKeyRangoMin(rangoMin: number | null): number {
  return rangoMin === null ? Number.NEGATIVE_INFINITY : rangoMin;
}

function formatLimite(value: number | null): string {
  return value === null ? '—' : String(value);
}

export function validarRangosPorIndicador(
  indicadorCodigo: IndicadorCodigo,
  filas: RangoImportRow[],
): { errores: string[]; rangosValidados: RangoValidado[] } {
  const errores: string[] = [];

  if (filas.length !== 4) {
    errores.push(
      `Indicador ${indicadorCodigo}: debe tener exactamente 4 rangos (tiene ${filas.length})`,
    );
    return { errores, rangosValidados: [] };
  }

  const sinMin = filas.filter((fila) => fila.rangoMin === null);
  const sinMax = filas.filter((fila) => fila.rangoMax === null);

  if (sinMin.length !== 1) {
    errores.push(
      `Indicador ${indicadorCodigo}: debe tener exactamente 1 fila sin rango_min (tiene ${sinMin.length})`,
    );
  }

  if (sinMax.length !== 1) {
    errores.push(
      `Indicador ${indicadorCodigo}: debe tener exactamente 1 fila sin rango_max (tiene ${sinMax.length})`,
    );
  }

  for (const fila of filas) {
    if (!Number.isInteger(fila.puntos) || fila.puntos < 0) {
      errores.push(
        `Indicador ${indicadorCodigo}, fila Excel ${fila.excelRow}: puntos debe ser un entero ≥ 0`,
      );
    }

    if (fila.rangoMin !== null && fila.rangoMax !== null && fila.rangoMin >= fila.rangoMax) {
      errores.push(
        `Indicador ${indicadorCodigo}, fila Excel ${fila.excelRow}: rango_min debe ser menor que rango_max`,
      );
    }
  }

  if (errores.length > 0) {
    return { errores, rangosValidados: [] };
  }

  const ordenadas = [...filas].sort(
    (a, b) => sortKeyRangoMin(a.rangoMin) - sortKeyRangoMin(b.rangoMin),
  );

  for (let i = 0; i < ordenadas.length - 1; i++) {
    const actual = ordenadas[i]!;
    const siguiente = ordenadas[i + 1]!;
    const maxActual = actual.rangoMax;
    const minSiguiente = siguiente.rangoMin;

    if (maxActual === null || minSiguiente === null) {
      continue;
    }

    if (maxActual < minSiguiente) {
      errores.push(
        `Indicador ${indicadorCodigo}: hueco entre filas Excel ${actual.excelRow} y ${siguiente.excelRow} (rango_max=${formatLimite(maxActual)}, rango_min=${formatLimite(minSiguiente)})`,
      );
    } else if (maxActual > minSiguiente) {
      errores.push(
        `Indicador ${indicadorCodigo}: solapamiento entre filas Excel ${actual.excelRow} y ${siguiente.excelRow} (rango_max=${formatLimite(maxActual)}, rango_min=${formatLimite(minSiguiente)})`,
      );
    }
  }

  if (errores.length > 0) {
    return { errores, rangosValidados: [] };
  }

  const rangosValidados: RangoValidado[] = ordenadas.map((fila, index) => ({
    ...fila,
    orden: index + 1,
  }));

  return { errores, rangosValidados };
}

export function validarFilasImport(
  filas: RangoImportRow[],
): { errores: string[]; porIndicador: Map<IndicadorCodigo, RangoValidado[]> } {
  const errores: string[] = [];
  const porIndicador = new Map<IndicadorCodigo, RangoImportRow[]>();

  for (const fila of filas) {
    const grupo = porIndicador.get(fila.indicadorCodigo) ?? [];
    grupo.push(fila);
    porIndicador.set(fila.indicadorCodigo, grupo);
  }

  const validados = new Map<IndicadorCodigo, RangoValidado[]>();

  for (const [indicador, grupo] of porIndicador) {
    const resultado = validarRangosPorIndicador(indicador, grupo);
    errores.push(...resultado.errores);
    if (resultado.rangosValidados.length > 0) {
      validados.set(indicador, resultado.rangosValidados);
    }
  }

  return { errores, porIndicador: validados };
}
