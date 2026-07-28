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

export interface ProcesoIndicador {
  id?: number;
  indicadorCodigo: IndicadorCodigo;
  valorRequerido: string | null;
  cumple: string | null;
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
  link: string | null;
  cuantia: string;
  moneda: string;
  segmento: SegmentoProceso;
  tipoProceso: TipoProceso;
  tipoInstrumento: TipoInstrumento;
  plazoEjecucionMeses: number;
  experiencia: boolean;
  observacion: string | null;
  estado: EstadoProceso;
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
}

export interface ProcesoListItem {
  id: number;
  codigo: string | null;
  empresaMostrar: string;
  estado: EstadoProceso;
  segmento: SegmentoProceso;
}

export interface ProcesoTarea {
  id: number;
  procesoId: number;
  tareaCodigo: string;
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
  ubicacionId: number;
  portalOrigen?: string;
  link?: string;
  cuantia: number;
  segmento: SegmentoProceso;
  tipoProceso: TipoProceso;
  tipoInstrumento: TipoInstrumento;
  plazoEjecucionMeses: number;
  experiencia: boolean;
  observacion?: string;
  indicadores: Array<{ indicadorCodigo: IndicadorCodigo; valorRequerido: number | null }>;
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
