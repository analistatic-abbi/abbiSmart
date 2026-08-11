import { Moneda } from '../enums/moneda.enum';

const MONEDA_POR_PAIS: Record<string, string> = {
  Colombia: Moneda.COP,
  Perú: Moneda.PEN,
  Peru: Moneda.PEN,
};

export function resolveMonedaForPais(pais: {
  nombre: string;
  codigoMoneda?: string | null;
}): string {
  if (pais.codigoMoneda?.trim()) {
    return pais.codigoMoneda.trim().toUpperCase();
  }

  return resolveMonedaPorPaisNombre(pais.nombre);
}

export function resolveMonedaPorPaisNombre(nombrePais: string): string {
  const moneda = MONEDA_POR_PAIS[nombrePais];

  if (!moneda) {
    throw new Error(`Moneda no configurada para el país: ${nombrePais}`);
  }

  return moneda;
}
