import { EstadoProyeccion } from '../enums/estado-proyeccion.enum';

export function calcularEstadoSugerido(
  fechaEstimadaPublicacion: string | Date,
  estadoActual?: EstadoProyeccion,
): EstadoProyeccion {
  if (
    estadoActual === EstadoProyeccion.PUBLICADO ||
    estadoActual === EstadoProyeccion.CERRADO
  ) {
    return estadoActual;
  }

  const fecha =
    typeof fechaEstimadaPublicacion === 'string'
      ? new Date(`${fechaEstimadaPublicacion}T00:00:00`)
      : fechaEstimadaPublicacion;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const diasFaltantes = Math.ceil(
    (fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diasFaltantes > 90) {
    return EstadoProyeccion.LEJANO;
  }

  if (diasFaltantes > 30) {
    return EstadoProyeccion.PROXIMO;
  }

  return EstadoProyeccion.SALE_ESTE_MES;
}
