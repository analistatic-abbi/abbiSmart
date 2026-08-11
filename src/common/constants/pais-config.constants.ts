export const PAIS_CONFIG_CALIFICACION_PUNTOS = 'calificacion_por_puntos_habilitada';
export const PAIS_CONFIG_MARGEN_CASI_PCT = 'indicador_margen_casi_pct';

export const PAIS_CONFIG_DEFAULTS: Array<{
  clave: string;
  valor: string;
  descripcion: string;
}> = [
  {
    clave: PAIS_CONFIG_CALIFICACION_PUNTOS,
    valor: 'false',
    descripcion:
      'Habilita formatos de calificación por puntos y el panel de rúbrica en procesos',
  },
  {
    clave: PAIS_CONFIG_MARGEN_CASI_PCT,
    valor: '5',
    descripcion:
      'Margen % para zonas Casi Aprobado / Casi Desaprobado en evaluación de indicadores',
  },
];
