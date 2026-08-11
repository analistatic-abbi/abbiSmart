import { EstadoKamRonda } from '../models/kam.model';

export function claseBadgeEstadoKamRonda(estado: EstadoKamRonda | string | null): string {
  switch (estado) {
    case EstadoKamRonda.Pendiente:
      return 'badge badge--pendiente';
    case EstadoKamRonda.Ejecutado:
      return 'badge badge--ejecutado';
    case EstadoKamRonda.Socializado:
      return 'badge badge--socializado';
    default:
      return 'badge';
  }
}

export function labelTipoEventoKam(): string {
  return 'Reunión fin de ronda';
}
