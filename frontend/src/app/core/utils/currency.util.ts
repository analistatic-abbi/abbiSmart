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
      return `${sign}$${formatted}${suffix}`;
    }
  }

  const fallback = scaled.toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
  return `${sign}$${fallback}${suffix}`;
}

export function formatCurrencyAbbreviated(value: string | number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';

  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  const amount = Math.abs(n);

  if (abs >= 1_000_000_000) {
    return formatScaledUnit(amount, 1_000_000_000, 'B', sign);
  }
  if (abs >= 1_000_000) {
    return formatScaledUnit(amount, 1_000_000, 'M', sign);
  }
  if (abs >= 1_000) {
    return formatScaledUnit(amount, 1_000, 'K', sign);
  }

  return `${sign}$${amount.toLocaleString('es-CO', { maximumFractionDigits: 2 })}`;
}
