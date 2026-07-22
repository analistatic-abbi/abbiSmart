import { EstadoProyeccion } from '../enums/estado-proyeccion.enum';

const ORDEN_ESTADOS: EstadoProyeccion[] = [
  EstadoProyeccion.LEJANO,
  EstadoProyeccion.PROXIMO,
  EstadoProyeccion.SALE_ESTE_MES,
];

const UMBRAL_POR_ESTADO: Partial<Record<EstadoProyeccion, string>> = {
  [EstadoProyeccion.PROXIMO]: 'Proximo',
  [EstadoProyeccion.SALE_ESTE_MES]: 'SaleEsteMes',
};

function indiceEstado(estado: EstadoProyeccion): number {
  const idx = ORDEN_ESTADOS.indexOf(estado);
  return idx >= 0 ? idx : -1;
}

/** Umbrales de alerta cruzados al pasar de estadoAnterior a estadoNuevo. */
export function detectarUmbralesTransicion(
  estadoAnterior: EstadoProyeccion,
  estadoNuevo: EstadoProyeccion,
): string[] {
  const umbrales: string[] = [];
  const idxAnterior = indiceEstado(estadoAnterior);
  const idxNuevo = indiceEstado(estadoNuevo);

  if (idxAnterior < 0 || idxNuevo < 0 || idxNuevo <= idxAnterior) {
    return umbrales;
  }

  for (let i = idxAnterior + 1; i <= idxNuevo; i += 1) {
    const estado = ORDEN_ESTADOS[i];
    const umbral = UMBRAL_POR_ESTADO[estado];

    if (umbral) {
      umbrales.push(umbral);
    }
  }

  return umbrales;
}
