import { PaisReferenciaDto } from '../../modules/catalogos/dto/pais-response.dto';
import worldCountriesData from './world-countries.json';

let cachedWorldCountries: PaisReferenciaDto[] | null = null;

export function getWorldCountries(): PaisReferenciaDto[] {
  if (!cachedWorldCountries) {
    cachedWorldCountries = worldCountriesData as PaisReferenciaDto[];
  }

  return cachedWorldCountries;
}

export function findWorldCountryByIso(iso: string): PaisReferenciaDto | undefined {
  const normalized = iso.trim().toUpperCase();
  return getWorldCountries().find((country) => country.iso === normalized);
}
