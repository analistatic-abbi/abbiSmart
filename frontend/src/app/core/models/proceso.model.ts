export enum EstadoProceso {
  PorValidar = 'Por Validar',
  EnProceso = 'En Proceso',
  Descartado = 'Descartado',
  EnValidacion = 'En Validación',
  Presentado = 'Presentado',
  Subsanacion = 'Subsanación',
  Adjudicado = 'Adjudicado',
  Cerrado = 'Cerrado',
}

export enum IndicadorCodigo {
  KTNO = 'KTNO',
  PN = 'PN',
  ROE = 'ROE',
  ROA = 'ROA',
  MDN = 'MDN',
  IL = 'IL',
  E = 'E',
  RCI = 'RCI',
}

export const INDICADORES_ORDEN: IndicadorCodigo[] = [
  IndicadorCodigo.KTNO,
  IndicadorCodigo.PN,
  IndicadorCodigo.ROE,
  IndicadorCodigo.ROA,
  IndicadorCodigo.MDN,
  IndicadorCodigo.IL,
  IndicadorCodigo.E,
  IndicadorCodigo.RCI,
];

export enum SegmentoProceso {
  GasNatural = 'Gas Natural',
  Alcantarillado = 'Alcantarillado',
  Electricidad = 'Electricidad',
  ObraCivil = 'Obra Civil',
  ServiciosAdicionales = 'Servicios Adicionales',
}

export enum TipoProceso {
  Periodico = 'Periódico',
  NoPeriodico = 'No periódico',
}

export enum TipoInstrumento {
  RFI = 'RFI',
  Cotizacion = 'Cotización',
  Licitacion = 'Licitación',
}

export enum MotivoPerdidaProceso {
  PrecioNoCompetitivo = 'Precio no competitivo',
  IncumplimientoIndicador = 'Incumplimiento de indicador financiero',
  EntidadCancelo = 'La entidad canceló el proceso',
  NoPresentoPropuesta = 'No se alcanzó a presentar propuesta',
  Otro = 'Otro',
}

export const MOTIVOS_PERDIDA: MotivoPerdidaProceso[] = [
  MotivoPerdidaProceso.PrecioNoCompetitivo,
  MotivoPerdidaProceso.IncumplimientoIndicador,
  MotivoPerdidaProceso.EntidadCancelo,
  MotivoPerdidaProceso.NoPresentoPropuesta,
  MotivoPerdidaProceso.Otro,
];

export function requiereMotivoPerdida(
  estadoAnterior: EstadoProceso,
  estadoNuevo: EstadoProceso,
): boolean {
  if (estadoNuevo === EstadoProceso.Descartado) return true;
  if (estadoNuevo === EstadoProceso.Cerrado && estadoAnterior !== EstadoProceso.Adjudicado) {
    return true;
  }
  return false;
}

export function requiereMotivoBackfill(proceso: Proceso): boolean {
  if (proceso.motivoPerdida) return false;
  if (proceso.estado === EstadoProceso.Descartado) return true;
  if (proceso.estado === EstadoProceso.Cerrado && !proceso.fueAdjudicado) return true;
  return false;
}

export const TRANSICIONES_ESTADO: Record<EstadoProceso, EstadoProceso[]> = {
  [EstadoProceso.PorValidar]: [EstadoProceso.EnProceso, EstadoProceso.Descartado],
  [EstadoProceso.EnProceso]: [EstadoProceso.Descartado],
  [EstadoProceso.Descartado]: [],
  [EstadoProceso.EnValidacion]: [],
  [EstadoProceso.Presentado]: [
    EstadoProceso.Subsanacion,
    EstadoProceso.Adjudicado,
    EstadoProceso.Cerrado,
  ],
  [EstadoProceso.Subsanacion]: [EstadoProceso.Presentado, EstadoProceso.Adjudicado],
  [EstadoProceso.Adjudicado]: [EstadoProceso.Cerrado],
  [EstadoProceso.Cerrado]: [],
};

export enum ResultadoIndicador {
  Aprobado = 'Aprobado',
  CasiAprobado = 'Casi Aprobado',
  CasiDesaprobado = 'Casi Desaprobado',
  NoAprobado = 'No Aprobado',
}

export interface ProcesoIndicador {
  id?: number;
  indicadorCodigo: IndicadorCodigo;
  valorRequerido: string | null;
  cumple: string | null;
}

export interface ProcesoContacto {
  contactoId: number;
  nombre: string;
  cargo: string | null;
  correo: string | null;
  telefono: string | null;
  fechaAsociacion: string;
}

export interface Proceso {
  id: number;
  idDigitado: string;
  codigo: string | null;
  empresaClienteId: number | null;
  empresaOtro: string | null;
  empresaMostrar?: string | null;
  ubicacionId: number;
  portalOrigen: string | null;
  portalOrigenOtro: string | null;
  portalOrigenMostrar?: string | null;
  link: string | null;
  objeto: string | null;
  cuantia: string;
  moneda: string;
  segmento: string;
  tipoProceso: TipoProceso;
  tipoInstrumento: TipoInstrumento;
  plazoEjecucionMeses: number;
  experiencia: boolean;
  observacion: string | null;
  motivoPerdida?: MotivoPerdidaProceso | null;
  motivoPerdidaOtro?: string | null;
  motivoPerdidaRegistradoEn?: string | null;
  motivoPerdidaUsuarioId?: number | null;
  motivoPerdidaUsuarioNombre?: string | null;
  fueAdjudicado?: boolean;
  estado: EstadoProceso;
  anioParametros?: number;
  fechaApertura: string | null;
  fechaCierre: string | null;
  fechaManifestacionInteres?: string | null;
  fechaAdquisicionDerecho?: string | null;
  fechaReunionAclaratoria?: string | null;
  fechaVisitaTecnica?: string | null;
  fechaSolicitudesAclaracion?: string | null;
  fechaRespuestaAclaracion?: string | null;
  fechaLimitacionMypymes?: string | null;
  avancePorcentaje?: number | null;
  indicadores?: ProcesoIndicador[];
  devueltoValidacion?: boolean;
  comentarioDevolucionValidacion?: string | null;
  validadorDevolucionNombre?: string | null;
  fechaDevolucionValidacion?: string | null;
  contactos?: ProcesoContacto[];
}

export interface ProcesoListItem {
  id: number;
  codigo: string | null;
  objeto?: string | null;
  empresaMostrar: string;
  estado: EstadoProceso;
  segmento: string;
  tipoProceso: TipoProceso;
  tipoInstrumento: TipoInstrumento;
  cuantia?: string;
  moneda?: string;
  devueltoValidacion?: boolean;
  comentarioDevolucionValidacion?: string | null;
  validadorDevolucionNombre?: string | null;
}

export interface ProcesoTarea {
  id: number;
  procesoId: number;
  tareaCodigo: string;
  tareaNombre?: string | null;
  aplica: boolean;
  evidencia: string | null;
  evidenciaArchivoNombre?: string | null;
  evidenciaUrl?: string | null;
  completada: boolean;
  avancePorcentaje?: number;
}

export interface CreateProcesoPayload {
  idDigitado: string;
  empresaClienteId?: number;
  empresaOtro?: string;
  contactoIds?: number[];
  ubicacionId: number;
  portalOrigen?: string;
  portalOrigenOtro?: string;
  link?: string;
  objeto?: string;
  cuantia: number;
  segmento: string;
  tipoProceso: TipoProceso;
  tipoInstrumento: TipoInstrumento;
  plazoEjecucionMeses: number;
  experiencia: boolean;
  observacion?: string;
  indicadores: Array<{ indicadorCodigo: string; valorRequerido: number | null }>;
  anioParametros?: number;
  confirmarIndicadoresVacios?: boolean;
  fechaApertura: string;
  fechaCierre: string;
}

export interface ClienteOption {
  id: number;
  empresa: string;
}

export interface UbicacionOption {
  id: number;
  departamento: string;
  municipioProvincia: string;
}
