const FLAG_CDN_BASE = 'https://flagcdn.com/w80';

const LEGACY_FLAG_BY_PAIS_ID: Record<number, string> = {
  1: `${FLAG_CDN_BASE}/co.png`,
  2: `${FLAG_CDN_BASE}/pe.png`,
};

const DEFAULT_FLAG = 'assets/flags/default.svg';

function normalizeCountryName(nombre: string | null | undefined): string {
  return (nombre ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function flagFromIso(codigoIso: string | null | undefined): string | null {
  const iso = codigoIso?.trim().toUpperCase();
  if (!iso || iso.length !== 2) {
    return null;
  }

  return `${FLAG_CDN_BASE}/${iso.toLowerCase()}.png`;
}

export function countryIsoCode(
  nombre: string | null | undefined,
  paisId?: number | null,
  codigoIso?: string | null,
): string {
  if (codigoIso?.trim()) {
    return codigoIso.trim().toUpperCase();
  }

  if (paisId && LEGACY_FLAG_BY_PAIS_ID[paisId]) {
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
  codigoIso?: string | null,
): string {
  const fromIso = flagFromIso(codigoIso);
  if (fromIso) {
    return fromIso;
  }

  const code = countryIsoCode(nombre, paisId, codigoIso);
  if (code) {
    return `${FLAG_CDN_BASE}/${code.toLowerCase()}.png`;
  }

  if (paisId && LEGACY_FLAG_BY_PAIS_ID[paisId]) {
    return LEGACY_FLAG_BY_PAIS_ID[paisId];
  }

  return DEFAULT_FLAG;
}
