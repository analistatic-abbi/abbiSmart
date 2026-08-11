export interface PaisCapabilities {
  calificacionPorPuntos: boolean;
  margenCasiPct: number;
  etiquetasGeo: {
    nivel1: string;
    nivel2: string;
  };
}

export type CatalogoPaisTipo =
  | 'segmento_proceso'
  | 'segmento_cliente'
  | 'indicador'
  | 'portal_origen'
  | 'etiqueta_geo_nivel1'
  | 'etiqueta_geo_nivel2';

export interface CatalogoPaisItem {
  id: number;
  tipo: CatalogoPaisTipo;
  codigo: string;
  etiqueta: string;
  orden: number;
  activo: boolean;
}

export interface ConfiguracionPaisItem {
  clave: string;
  valor: string;
  descripcion: string | null;
}

export interface PlantillaTareaPais {
  id: number;
  codigo: string;
  nombre: string;
  orden: number;
  activo: boolean;
  aplicaRfi: boolean;
  requiereFechaAdquisicion: boolean;
}
