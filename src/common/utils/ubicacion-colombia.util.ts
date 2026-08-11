export interface UbicacionColombiaNormalizada {
  departamento: string;
  municipioProvincia: string;
}

const DEPARTAMENTO_CUNDINAMARCA = 'Cundinamarca';
const MUNICIPIO_BOGOTA = 'Bogotá';

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isBogotaDepartamento(departamento: string): boolean {
  const norm = normalizeText(departamento);
  return norm === 'bogota' || norm === 'bogota dc' || norm === 'bogota d c';
}

export function isBogotaMunicipio(municipio: string): boolean {
  const norm = normalizeText(municipio);
  return norm === 'bogota' || norm === 'bogota dc' || norm === 'bogota d c';
}

export function normalizeColombiaUbicacionInput(
  departamento: string,
  municipio: string,
): UbicacionColombiaNormalizada {
  const dep = departamento.trim();
  const mun = municipio.trim();

  if (isBogotaDepartamento(dep)) {
    return {
      departamento: DEPARTAMENTO_CUNDINAMARCA,
      municipioProvincia: mun && !isBogotaMunicipio(mun) ? mun : MUNICIPIO_BOGOTA,
    };
  }

  if (isBogotaMunicipio(mun)) {
    return {
      departamento: dep && !isBogotaDepartamento(dep) ? dep : DEPARTAMENTO_CUNDINAMARCA,
      municipioProvincia: MUNICIPIO_BOGOTA,
    };
  }

  return {
    departamento: dep,
    municipioProvincia: mun,
  };
}

export function normalizeColombiaUbicacionRows(
  rows: UbicacionColombiaNormalizada[],
): UbicacionColombiaNormalizada[] {
  const normalized = rows
    .filter((row) => !isBogotaDepartamento(row.departamento))
    .map((row) => {
      if (
        normalizeText(row.departamento) === normalizeText(DEPARTAMENTO_CUNDINAMARCA) &&
        isBogotaMunicipio(row.municipioProvincia)
      ) {
        return {
          departamento: DEPARTAMENTO_CUNDINAMARCA,
          municipioProvincia: MUNICIPIO_BOGOTA,
        };
      }

      return row;
    });

  const hasBogotaEnCundinamarca = normalized.some(
    (row) =>
      normalizeText(row.departamento) === normalizeText(DEPARTAMENTO_CUNDINAMARCA) &&
      normalizeText(row.municipioProvincia) === normalizeText(MUNICIPIO_BOGOTA),
  );

  if (!hasBogotaEnCundinamarca) {
    normalized.push({
      departamento: DEPARTAMENTO_CUNDINAMARCA,
      municipioProvincia: MUNICIPIO_BOGOTA,
    });
  }

  return normalized;
}

export function bogotaMunicipioAliases(): string[] {
  return [MUNICIPIO_BOGOTA, 'Bogotá D.C.', 'Bogota', 'Bogota DC'];
}
