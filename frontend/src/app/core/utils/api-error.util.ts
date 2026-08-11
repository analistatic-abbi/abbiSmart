import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorBody } from '../models/auth.model';

export function mensajeErrorApi(
  err: unknown,
  fallback = 'Ocurrió un error inesperado.',
): string {
  if (!(err instanceof HttpErrorResponse)) {
    return fallback;
  }

  const body = err.error as ApiErrorBody | null;
  if (body?.message) {
    return body.message;
  }

  return fallback;
}

export function mensajeExitoApi(
  response: unknown,
  fallback: string,
): string {
  if (response && typeof response === 'object' && 'message' in response) {
    const message = (response as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message.trim();
    }
  }

  return fallback;
}

export function esErrorCodigo(err: unknown, code: string): boolean {
  if (!(err instanceof HttpErrorResponse)) {
    return false;
  }

  const body = err.error as ApiErrorBody | null;
  return body?.errorCode === code;
}
