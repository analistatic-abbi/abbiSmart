export interface Pais {
  id: number;
  nombre: string;
  codigoIso: string | null;
  codigoMoneda: string | null;
  activo: boolean;
  ubicacionesCount?: number;
  plantillaTareasCount?: number;
  calificacionPorPuntosHabilitada?: boolean;
  listoOperacion?: boolean;
  catalogosActivosCount?: number;
  advertencias?: string[];
}

export interface PaisOption {
  id: number;
  nombre: string;
  codigoIso?: string | null;
  codigoMoneda?: string | null;
}

export interface PaisReferencia {
  iso: string;
  nombre: string;
  codigoMoneda: string;
  codigoMonedaNombre?: string;
}

export interface CreatePaisPayload {
  codigoIso: string;
  nombre?: string;
  activo?: boolean;
}

export interface UpdatePaisPayload {
  nombre?: string;
  activo?: boolean;
}
