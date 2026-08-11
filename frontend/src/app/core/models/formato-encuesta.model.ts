export interface FormatoEncuestaItem {
  id: number;
  orden: number;
  subseccion: string | null;
  requiereCalificacion: boolean;
}

export interface FormatoEncuestaPregunta {
  id: number;
  orden: number;
  texto: string;
  items?: FormatoEncuestaItem[];
}

export interface FormatoEncuestaSeccion {
  id: number;
  orden: number;
  titulo: string;
  preguntas: FormatoEncuestaPregunta[];
}

export interface FormatoEncuestaItemInput {
  orden: number;
  subseccion?: string | null;
  requiereCalificacion: boolean;
}

export interface FormatoEncuestaPreguntaInput {
  orden: number;
  texto: string;
  items: FormatoEncuestaItemInput[];
}

/** @deprecated Prefer FormatoEncuestaPreguntaInput with items */
export interface FormatoEncuestaPreguntaPlanaInput {
  orden: number;
  texto: string;
}

export interface FormatoEncuestaSeccionInput {
  orden: number;
  titulo: string;
  preguntas: FormatoEncuestaPreguntaInput[];
}

export interface FormatoEncuestaListItem {
  id: number;
  nombre: string;
  activo: boolean;
  cantidadPreguntas: number;
  cantidadItems: number;
  fechaCreacion: string;
}

export interface FormatoEncuestaDetail {
  id: number;
  nombre: string;
  activo: boolean;
  clonadoDeId: number | null;
  fechaCreacion: string;
  secciones: FormatoEncuestaSeccion[];
  /** Flatten de preguntas (compat) */
  preguntas: FormatoEncuestaPregunta[];
  enUso: boolean;
}
