const FLAG_ASSETS: Record<string, string> = {
  CO: 'assets/flags/co.svg',
  PE: 'assets/flags/pe.svg',
};

const FLAG_BY_PAIS_ID: Record<number, string> = {
  1: FLAG_ASSETS['CO'],
  2: FLAG_ASSETS['PE'],
};

const DEFAULT_FLAG = 'assets/flags/default.svg';

function normalizeCountryName(nombre: string | null | undefined): string {
  return (nombre ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function countryIsoCode(
  nombre: string | null | undefined,
  paisId?: number | null,
): string {
  if (paisId && FLAG_BY_PAIS_ID[paisId]) {
    return paisId === 1 ? 'CO' : paisId === 2 ? 'PE' : '';
  }

  const key = normalizeCountryName(nombre);
  if (key.includes('colombia')) return 'CO';
  if (key === 'peru' || key.startsWith('peru ')) return 'PE';
  return '';
}

export function countryFlagUrl(
  nombre: string | null | undefined,
  paisId?: number | null,
): string {
  if (paisId && FLAG_BY_PAIS_ID[paisId]) {
    return FLAG_BY_PAIS_ID[paisId];
  }

  const code = countryIsoCode(nombre);
  return FLAG_ASSETS[code] ?? DEFAULT_FLAG;
}
