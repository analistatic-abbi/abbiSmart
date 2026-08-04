export interface FormatoCalificacionRango {
  id: number;
  indicadorCodigo: string;
  orden: number;
  rangoMin: string | null;
  rangoMax: string | null;
  puntos: number;
}

export interface FormatoCalificacionListItem {
  id: number;
  nombre: string;
  puntajeMinimo: number;
  activo: boolean;
  cantidadIndicadores: number;
  fechaCreacion: string;
}

export interface FormatoCalificacionDetail extends FormatoCalificacionListItem {
  rangos: FormatoCalificacionRango[];
}

export interface ProcesoCalificacionDetalle {
  indicadorCodigo: string;
  parametroFinancieroId: number;
  valorAbbi: string;
  rangoMin: string | null;
  rangoMax: string | null;
  puntosObtenidos: number;
}

export interface ProcesoCalificacion {
  id: number;
  formatoCalificacionId: number;
  formatoNombre: string;
  anioParametros: number;
  puntajeTotal: number;
  puntajeMinimo: number;
  resultado: 'Aprobado' | 'No Aprobado';
  fechaEvaluacion: string;
  detalle: ProcesoCalificacionDetalle[];
}

export interface EvaluarCalificacionesPayload {
  formatoIds: number[];
  anioParametros?: number;
}

export const PROMPT_IA_FORMATO_CALIFICACION = `Tengo una imagen o PDF con una tabla de calificación financiera por rangos y puntos (el tipo de tabla que usan algunas entidades para evaluar contratistas). Necesito que la conviertas a un archivo Excel (.xlsx) con EXACTAMENTE estas 4 columnas en la primera fila: indicador_codigo, rango_min, rango_max, puntos.

Reglas:
- indicador_codigo debe ser uno de estos 8 códigos exactos (usa esta equivalencia si la imagen usa otros nombres):
  KTNO = Capital de Trabajo Neto Operativo (también aparece como "CTN" o "Capital de trabajo")
  PN = Patrimonio Neto
  ROE = Rentabilidad del Patrimonio
  ROA = Rentabilidad del Activo
  MDN = Múltiplo de Deuda Neta
  IL = Índice de Liquidez
  E = Endeudamiento (también aparece como "IE")
  RCI = Cobertura de Intereses (también aparece como "CI")
- Cada indicador debe tener exactamente 4 filas (4 rangos).
- rango_min y rango_max deben ser solo números: sin símbolos de moneda, sin comas de miles, sin símbolo de porcentaje (si el indicador es un porcentaje, escribe el número tal cual aparece en la tabla, por ejemplo 5.0, no "5.0%").
- Para KTNO y PN (indicadores monetarios), escribe el valor en millones de pesos (por ejemplo 2.915, no 2915000000 ni con sufijo M).
- Si un rango no tiene límite inferior o superior (por ejemplo, "CTN < 2,915" o "CTN >= 4,198"), deja esa celda vacía en vez de escribir un texto.
- puntos debe ser un número entero.
- No agregues filas de totales, encabezados adicionales, ni el nombre del formato — el Excel debe tener solamente las filas de rangos, una por cada combinación de indicador y rango.

Aquí está la imagen/tabla de la que debes partir: [el usuario adjunta aquí su imagen o PDF]`;

export const COLUMNAS_FORMATO_CALIFICACION = [
  {
    nombre: 'indicador_codigo',
    descripcion: 'Uno de los 8 códigos: KTNO, PN, ROE, ROA, MDN, IL, E, RCI.',
  },
  {
    nombre: 'rango_min',
    descripcion: 'Límite inferior inclusivo. Vacío si el rango no tiene tope inferior. KTNO/PN: millones de pesos.',
  },
  {
    nombre: 'rango_max',
    descripcion: 'Límite superior exclusivo. Vacío si el rango no tiene tope superior. KTNO/PN: millones de pesos.',
  },
  {
    nombre: 'puntos',
    descripcion: 'Puntos enteros otorgados cuando el valor ABBI cae en ese rango.',
  },
];
