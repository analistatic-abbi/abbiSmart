import { EstadoProceso } from '../enums/estado-proceso.enum';
import { EstadoProyeccion } from '../enums/estado-proyeccion.enum';
import {
  EfectividadMercadoConteosRaw,
  EfectividadMercadoMercadoDto,
} from '../../modules/proyecciones/dto/efectividad-mercado.dto';

export interface ProyeccionDesenlaceInput {
  estado: EstadoProyeccion | string;
  procesoResultanteId: number | null;
  procesoEliminado?: boolean;
  procesoEstado?: EstadoProceso | string | null;
  fueAdjudicado?: boolean | null;
}

export type DesenlaceProyeccion =
  | 'ganada'
  | 'materializada_no_ganada'
  | 'nunca_materializada'
  | 'pendiente';

function procesoFueAdjudicado(input: ProyeccionDesenlaceInput): boolean {
  if (!input.procesoResultanteId || input.procesoEliminado) {
    return false;
  }

  return (
    input.fueAdjudicado === true ||
    input.procesoEstado === EstadoProceso.ADJUDICADO
  );
}

export function clasificarDesenlaceProyeccion(
  input: ProyeccionDesenlaceInput,
): DesenlaceProyeccion {
  if (input.procesoResultanteId) {
    if (input.procesoEliminado) {
      return 'pendiente';
    }

    return procesoFueAdjudicado(input)
      ? 'ganada'
      : 'materializada_no_ganada';
  }

  if (input.estado === EstadoProyeccion.CERRADO) {
    return 'nunca_materializada';
  }

  return 'pendiente';
}

export function conteosDesdeDesenlaces(
  desenlaces: DesenlaceProyeccion[],
): EfectividadMercadoConteosRaw {
  return desenlaces.reduce<EfectividadMercadoConteosRaw>(
    (acc, desenlace) => {
      if (desenlace === 'ganada') {
        acc.ganadas += 1;
      } else if (desenlace === 'materializada_no_ganada') {
        acc.materializadasNoGanadas += 1;
      } else if (desenlace === 'nunca_materializada') {
        acc.nuncaMaterializadas += 1;
      } else {
        acc.pendientes += 1;
      }

      return acc;
    },
    {
      nuncaMaterializadas: 0,
      materializadasNoGanadas: 0,
      ganadas: 0,
      pendientes: 0,
    },
  );
}

function redondearPct(valor: number): number {
  return Math.round(valor * 10) / 10;
}

export function calcularMetricasMercado(
  conteos: EfectividadMercadoConteosRaw,
): EfectividadMercadoMercadoDto {
  const total =
    conteos.nuncaMaterializadas +
    conteos.materializadasNoGanadas +
    conteos.ganadas +
    conteos.pendientes;
  const resueltas =
    conteos.nuncaMaterializadas +
    conteos.materializadasNoGanadas +
    conteos.ganadas;
  const materializadas =
    conteos.materializadasNoGanadas + conteos.ganadas;

  return {
    total,
    pendientes: conteos.pendientes,
    resueltas,
    nuncaMaterializadas: conteos.nuncaMaterializadas,
    materializadasNoGanadas: conteos.materializadasNoGanadas,
    ganadas: conteos.ganadas,
    materializadas,
    pctNuncaMaterializadas:
      resueltas > 0
        ? redondearPct((conteos.nuncaMaterializadas / resueltas) * 100)
        : null,
    pctMaterializadasNoGanadas:
      resueltas > 0
        ? redondearPct((conteos.materializadasNoGanadas / resueltas) * 100)
        : null,
    pctGanadas:
      resueltas > 0
        ? redondearPct((conteos.ganadas / resueltas) * 100)
        : null,
    pctGanadasDeMaterializadas:
      materializadas > 0
        ? redondearPct((conteos.ganadas / materializadas) * 100)
        : null,
  };
}

export function metricasMercadoVacias(): EfectividadMercadoMercadoDto {
  return calcularMetricasMercado({
    nuncaMaterializadas: 0,
    materializadasNoGanadas: 0,
    ganadas: 0,
    pendientes: 0,
  });
}
