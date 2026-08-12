import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorBody } from '../models/auth.model';

const FIELD_LABELS: Record<string, string> = {
  correo: 'correo electrónico',
  password: 'contraseña',
  nombre: 'nombre',
  mensaje: 'mensaje',
  telefono: 'teléfono',
};

function labelFor(property: string): string {
  return FIELD_LABELS[property] ?? property;
}

/** Última línea de defensa si el API aún devolviera un mensaje en inglés. */
function traducirMensajeIngles(message: string): string {
  const patterns: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
    [
      /^(.+) must be an email$/i,
      (m) => `El ${labelFor(m[1])} no es un correo válido`,
    ],
    [
      /^(.+) should not be empty$/i,
      (m) => `El campo ${labelFor(m[1])} es obligatorio`,
    ],
    [
      /^(.+) must be a string$/i,
      (m) => `El campo ${labelFor(m[1])} debe ser texto`,
    ],
    [
      /^(.+) must be a number$/i,
      (m) => `El campo ${labelFor(m[1])} debe ser un número`,
    ],
    [
      /^(.+) must be longer than or equal to (\d+) characters$/i,
      (m) => `El campo ${labelFor(m[1])} debe tener al menos ${m[2]} caracteres`,
    ],
    [
      /^(.+) must be shorter than or equal to (\d+) characters$/i,
      (m) => `El campo ${labelFor(m[1])} no puede superar ${m[2]} caracteres`,
    ],
    [
      /^property (.+) should not exist$/i,
      (m) => `La propiedad ${m[1]} no está permitida`,
    ],
  ];

  for (const [regex, build] of patterns) {
    const match = message.match(regex);
    if (match) {
      return build(match);
    }
  }

  return message;
}

export function mensajeErrorApi(
  err: unknown,
  fallback = 'Ocurrió un error inesperado.',
): string {
  if (!(err instanceof HttpErrorResponse)) {
    return fallback;
  }

  const body = err.error as ApiErrorBody | null;
  if (body?.message) {
    return traducirMensajeIngles(body.message);
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
