export function parseIsoDateLocal(iso: string): Date {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatFechaHora(iso: string | null | undefined): string {
  if (!iso) return '—';

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  return date.toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTiempoRelativo(iso: string | null | undefined): string {
  if (!iso) return '';

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const diffSec = Math.round((date.getTime() - Date.now()) / 1000);
  const absSec = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

  if (absSec < 45) {
    return 'Hace un momento';
  }

  if (absSec < 3600) {
    return rtf.format(Math.round(diffSec / 60), 'minute');
  }

  if (absSec < 86400) {
    return rtf.format(Math.round(diffSec / 3600), 'hour');
  }

  if (absSec < 604800) {
    return rtf.format(Math.round(diffSec / 86400), 'day');
  }

  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

export function formatFechaCorta(iso: string): string {
  const date = parseIsoDateLocal(iso);
  return date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
  });
}
