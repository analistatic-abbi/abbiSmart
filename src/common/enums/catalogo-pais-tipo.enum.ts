export enum CatalogoPaisTipo {
  SEGMENTO_PROCESO = 'segmento_proceso',
  SEGMENTO_CLIENTE = 'segmento_cliente',
  INDICADOR = 'indicador',
  PORTAL_ORIGEN = 'portal_origen',
  ETIQUETA_GEO_NIVEL1 = 'etiqueta_geo_nivel1',
  ETIQUETA_GEO_NIVEL2 = 'etiqueta_geo_nivel2',
}

export const CATALOGOS_NEGOCIO: CatalogoPaisTipo[] = [
  CatalogoPaisTipo.SEGMENTO_PROCESO,
  CatalogoPaisTipo.SEGMENTO_CLIENTE,
  CatalogoPaisTipo.INDICADOR,
  CatalogoPaisTipo.PORTAL_ORIGEN,
];
