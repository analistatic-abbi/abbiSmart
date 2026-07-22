import { Moneda } from '../enums/moneda.enum';

const MONEDA_POR_PAIS: Record<string, Moneda> = {
  Colombia: Moneda.COP,
  Perú: Moneda.PEN,
};

export function resolveMonedaPorPaisNombre(nombrePais: string): Moneda {
  const moneda = MONEDA_POR_PAIS[nombrePais];

  if (!moneda) {
    throw new Error(`Moneda no configurada para el país: ${nombrePais}`);
  }

  return moneda;
}
