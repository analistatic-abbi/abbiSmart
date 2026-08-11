import { CatalogoPaisTipo } from '../enums/catalogo-pais-tipo.enum';
import { IndicadorCodigo } from '../enums/indicador-codigo.enum';
import { SegmentoCliente } from '../enums/segmento-cliente.enum';
import { SegmentoProceso } from '../enums/segmento-proceso.enum';

export interface CatalogoPaisSeedItem {
  tipo: CatalogoPaisTipo;
  codigo: string;
  etiqueta: string;
  orden: number;
}

const SEGMENTOS_PROCESO: CatalogoPaisSeedItem[] = Object.values(
  SegmentoProceso,
).map((valor, index) => ({
  tipo: CatalogoPaisTipo.SEGMENTO_PROCESO,
  codigo: valor,
  etiqueta: valor,
  orden: index + 1,
}));

const SEGMENTOS_CLIENTE: CatalogoPaisSeedItem[] = Object.values(
  SegmentoCliente,
).map((valor, index) => ({
  tipo: CatalogoPaisTipo.SEGMENTO_CLIENTE,
  codigo: valor,
  etiqueta: valor,
  orden: index + 1,
}));

const INDICADORES: CatalogoPaisSeedItem[] = Object.values(IndicadorCodigo).map(
  (codigo, index) => ({
    tipo: CatalogoPaisTipo.INDICADOR,
    codigo,
    etiqueta: codigo,
    orden: index + 1,
  }),
);

const PORTALES_CO: CatalogoPaisSeedItem[] = [
  { tipo: CatalogoPaisTipo.PORTAL_ORIGEN, codigo: 'SECOP II', etiqueta: 'SECOP II', orden: 1 },
  { tipo: CatalogoPaisTipo.PORTAL_ORIGEN, codigo: 'TEJIDO', etiqueta: 'TEJIDO', orden: 2 },
  { tipo: CatalogoPaisTipo.PORTAL_ORIGEN, codigo: 'Otro', etiqueta: 'Otro', orden: 99 },
];

const PORTALES_PE: CatalogoPaisSeedItem[] = [
  { tipo: CatalogoPaisTipo.PORTAL_ORIGEN, codigo: 'SEACE', etiqueta: 'SEACE', orden: 1 },
  { tipo: CatalogoPaisTipo.PORTAL_ORIGEN, codigo: 'OSCE', etiqueta: 'OSCE', orden: 2 },
  { tipo: CatalogoPaisTipo.PORTAL_ORIGEN, codigo: 'Otro', etiqueta: 'Otro', orden: 99 },
];

const PORTALES_DEFAULT: CatalogoPaisSeedItem[] = [
  { tipo: CatalogoPaisTipo.PORTAL_ORIGEN, codigo: 'Otro', etiqueta: 'Otro', orden: 1 },
];

const GEO_CO: CatalogoPaisSeedItem[] = [
  {
    tipo: CatalogoPaisTipo.ETIQUETA_GEO_NIVEL1,
    codigo: 'nivel1',
    etiqueta: 'Departamento',
    orden: 1,
  },
  {
    tipo: CatalogoPaisTipo.ETIQUETA_GEO_NIVEL2,
    codigo: 'nivel2',
    etiqueta: 'Municipio',
    orden: 1,
  },
];

const GEO_PE: CatalogoPaisSeedItem[] = [
  {
    tipo: CatalogoPaisTipo.ETIQUETA_GEO_NIVEL1,
    codigo: 'nivel1',
    etiqueta: 'Departamento',
    orden: 1,
  },
  {
    tipo: CatalogoPaisTipo.ETIQUETA_GEO_NIVEL2,
    codigo: 'nivel2',
    etiqueta: 'Provincia',
    orden: 1,
  },
];

const GEO_EC: CatalogoPaisSeedItem[] = [
  {
    tipo: CatalogoPaisTipo.ETIQUETA_GEO_NIVEL1,
    codigo: 'nivel1',
    etiqueta: 'Provincia',
    orden: 1,
  },
  {
    tipo: CatalogoPaisTipo.ETIQUETA_GEO_NIVEL2,
    codigo: 'nivel2',
    etiqueta: 'Cantón',
    orden: 1,
  },
];

const GEO_DEFAULT = GEO_CO;

export function getCatalogoSeedForCountry(codigoIso: string): CatalogoPaisSeedItem[] {
  const iso = codigoIso.toUpperCase();
  const portales =
    iso === 'CO' ? PORTALES_CO : iso === 'PE' ? PORTALES_PE : PORTALES_DEFAULT;
  const geo =
    iso === 'CO' ? GEO_CO : iso === 'PE' ? GEO_PE : iso === 'EC' ? GEO_EC : GEO_DEFAULT;

  return [
    ...SEGMENTOS_PROCESO,
    ...SEGMENTOS_CLIENTE,
    ...INDICADORES,
    ...portales,
    ...geo,
  ];
}
