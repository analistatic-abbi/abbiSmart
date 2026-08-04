/**
 * Parsea entrada decimal tolerando coma; devuelve null si está vacía o incompleta.
 */
export function parseDecimalInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.replace(',', '.');
  if (normalized === '-' || normalized === '.' || normalized.endsWith('.')) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Indica si el texto es un decimal en edición (no actualizar store aún).
 */
export function esDecimalEnEdicion(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const normalized = trimmed.replace(',', '.');
  return normalized === '-' || normalized.endsWith('.') || normalized.endsWith(',');
}
