import { formatUbicacionCargaMasivaError } from './carga-masiva-error.util';

describe('formatUbicacionCargaMasivaError', () => {
  it('sugiere Cundinamarca + Bogotá para ubicaciones de Bogotá', () => {
    const result = formatUbicacionCargaMasivaError('Cundinamarca', 'Bogotá');

    expect(result.error).toContain('Cundinamarca');
    expect(result.error).toContain('Bogotá');
    expect(result.sugerencia).toContain('Cundinamarca');
    expect(result.sugerencia).toContain('Bogotá');
  });
});
