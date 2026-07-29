import { HttpErrorResponse } from '@angular/common/http';

export async function descargarBlob(blob: Blob, nombre: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = nombre;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function parseBlobErrorMessage(
  err: HttpErrorResponse,
  fallback: string,
): Promise<string> {
  const body = err.error;

  if (body instanceof Blob) {
    try {
      const text = await body.text();
      const json = JSON.parse(text) as { message?: string | string[] };
      if (Array.isArray(json.message)) {
        return json.message.join(', ');
      }
      if (json.message) {
        return json.message;
      }
    } catch {
      // ignore parse errors
    }
  }

  if (typeof body === 'object' && body !== null && 'message' in body) {
    const message = (body as { message?: string | string[] }).message;
    if (Array.isArray(message)) {
      return message.join(', ');
    }
    if (message) {
      return message;
    }
  }

  if (err.status === 404) {
    return 'El servicio de exportación no está disponible. Reinicie la API.';
  }

  return fallback;
}
