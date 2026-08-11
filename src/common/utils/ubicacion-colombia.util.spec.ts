import {
  isBogotaDepartamento,
  isBogotaMunicipio,
  normalizeColombiaUbicacionInput,
  normalizeColombiaUbicacionRows,
} from './ubicacion-colombia.util';

describe('ubicacion-colombia.util', () => {
  it('detecta Bogotá como departamento o municipio', () => {
    expect(isBogotaDepartamento('Bogotá D.C.')).toBe(true);
    expect(isBogotaMunicipio('Bogota')).toBe(true);
  });

  it('normaliza Bogotá D.C. como departamento hacia Cundinamarca/Bogotá', () => {
    expect(normalizeColombiaUbicacionInput('Bogotá D.C.', 'Bogotá D.C.')).toEqual({
      departamento: 'Cundinamarca',
      municipioProvincia: 'Bogotá',
    });
  });

  it('normaliza Cundinamarca + Bogotá', () => {
    expect(normalizeColombiaUbicacionInput('Cundinamarca', 'Bogotá')).toEqual({
      departamento: 'Cundinamarca',
      municipioProvincia: 'Bogotá',
    });
  });

  it('elimina Bogotá D.C. como departamento en filas de seed', () => {
    const rows = normalizeColombiaUbicacionRows([
      { departamento: 'Bogotá D.C.', municipioProvincia: 'Bogotá D.C.' },
      { departamento: 'Cundinamarca', municipioProvincia: 'Chía' },
      { departamento: 'Cundinamarca', municipioProvincia: 'Bogotá D.C.' },
    ]);

    expect(rows.some((row) => row.departamento === 'Bogotá D.C.')).toBe(false);
    expect(rows).toContainEqual({
      departamento: 'Cundinamarca',
      municipioProvincia: 'Bogotá',
    });
    expect(rows).toContainEqual({
      departamento: 'Cundinamarca',
      municipioProvincia: 'Chía',
    });
  });
});
