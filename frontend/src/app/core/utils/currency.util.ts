function formatScaledUnit(
  amount: number,
  divisor: number,
  suffix: string,
  sign: string,
): string {
  const scaled = amount / divisor;
  const amountCents = Math.round(amount * 100);

  for (let decimals = 0; decimals <= 4; decimals += 1) {
    const factor = 10 ** decimals;
    const abbreviated = Math.round(scaled * factor) / factor;

    if (Math.round(abbreviated * divisor * 100) === amountCents) {
      const formatted = abbreviated.toLocaleString('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
      });
      return `${sign}$${formatted} ${suffix}`;
    }
  }

  const fallback = scaled.toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
  return `${sign}$${fallback} ${suffix}`;
}

export function formatCurrencyFull(
  value: string | number | null | undefined,
  maxDecimals = 4,
): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const n = Number(value);
  if (!Number.isFinite(n)) {
    return String(value);
  }

  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(n).toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  })}`;
}

export function formatCuantiaConMoneda(
  cuantia: string | number | null | undefined,
  moneda: string | null | undefined,
  maxDecimals = 2,
): string {
  const formatted = formatCurrencyFull(cuantia, maxDecimals);
  if (formatted === '—') {
    return formatted;
  }
  return moneda ? `${formatted} ${moneda}` : formatted;
}

export function formatCurrencyAbbreviated(value: string | number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';

  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  const amount = Math.abs(n);

  if (abs >= 1_000_000_000) {
    return formatScaledUnit(amount, 1_000_000_000, 'mil mill.', sign);
  }
  if (abs >= 1_000_000) {
    return formatScaledUnit(amount, 1_000_000, 'mill.', sign);
  }
  if (abs >= 1_000) {
    return formatScaledUnit(amount, 1_000, 'mil', sign);
  }

  return `${sign}$${amount.toLocaleString('es-CO', { maximumFractionDigits: 2 })}`;
}
