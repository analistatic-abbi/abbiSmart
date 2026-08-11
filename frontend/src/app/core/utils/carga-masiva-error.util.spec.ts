import { sugerenciaLocalCargaMasiva } from './carga-masiva-error.util';

describe('carga-masiva-error.util', () => {
  it('sugiere Cundinamarca + Bogotá', () => {
    const sugerencia = sugerenciaLocalCargaMasiva({
      fila: 2,
      error: 'Ubicación no válida: Bogotá en Cundinamarca',
    });

    expect(sugerencia).toContain('Cundinamarca');
    expect(sugerencia).toContain('Bogotá');
  });
});
