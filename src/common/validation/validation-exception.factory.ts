import { BadRequestException, ValidationError } from '@nestjs/common';
import { ErrorCode } from '../exceptions/error-codes.enum';

const FIELD_LABELS: Record<string, string> = {
  correo: 'correo electrónico',
  password: 'contraseña',
  nombre: 'nombre',
  mensaje: 'mensaje',
  asunto: 'asunto',
  categoria: 'categoría',
  paginaActual: 'página actual',
  telefono: 'teléfono',
  cargo: 'cargo',
  clienteId: 'cliente',
  ubicacionId: 'ubicación',
  paisId: 'país',
  rol: 'rol',
  token: 'token',
  search: 'búsqueda',
  page: 'página',
  limit: 'límite',
  departamento: 'departamento',
  estado: 'estado',
  segmento: 'segmento',
  cuantia: 'cuantía',
  objeto: 'objeto',
  codigo: 'código',
  idDigitado: 'ID digitado',
  fechaReunion: 'fecha de reunión',
  fechaMensaje: 'fecha del mensaje',
  canal: 'canal',
  resultado: 'resultado',
  empresa: 'empresa',
  motivo: 'motivo',
  comentario: 'comentario',
  anio: 'año',
  mes: 'mes',
  vista: 'vista',
};

function labelFor(property: string): string {
  return FIELD_LABELS[property] ?? property;
}

function messageForConstraint(
  property: string,
  constraintKey: string,
  constraintMessage: string,
): string {
  const field = labelFor(property);

  switch (constraintKey) {
    case 'isEmail':
      return `El ${field} no es un correo válido`;
    case 'isNotEmpty':
      return `El campo ${field} es obligatorio`;
    case 'isString':
      return `El campo ${field} debe ser texto`;
    case 'isInt':
    case 'isNumber':
    case 'isNumberString':
      return `El campo ${field} debe ser un número`;
    case 'isBoolean':
      return `El campo ${field} debe ser verdadero o falso`;
    case 'isEnum':
      return `El valor de ${field} no es válido`;
    case 'isDateString':
    case 'isDate':
    case 'isIso8601':
      return `El campo ${field} debe ser una fecha válida`;
    case 'isArray':
      return `El campo ${field} debe ser una lista`;
    case 'isPositive':
      return `El campo ${field} debe ser un número positivo`;
    case 'isUuid':
      return `El campo ${field} no es válido`;
    case 'isUrl':
      return `El campo ${field} debe ser una URL válida`;
    case 'matches':
      return `El formato de ${field} no es válido`;
    case 'minLength': {
      const match = constraintMessage.match(/at least (\d+)/i);
      return match
        ? `El campo ${field} debe tener al menos ${match[1]} caracteres`
        : `El campo ${field} es demasiado corto`;
    }
    case 'maxLength': {
      const match = constraintMessage.match(/longer than (\d+)/i);
      return match
        ? `El campo ${field} no puede superar ${match[1]} caracteres`
        : `El campo ${field} es demasiado largo`;
    }
    case 'min': {
      const match = constraintMessage.match(/not be less than (\S+)/i);
      return match
        ? `El campo ${field} no puede ser menor que ${match[1]}`
        : `El valor de ${field} es demasiado bajo`;
    }
    case 'max': {
      const match = constraintMessage.match(/not be greater than (\S+)/i);
      return match
        ? `El campo ${field} no puede ser mayor que ${match[1]}`
        : `El valor de ${field} es demasiado alto`;
    }
    case 'arrayMinSize': {
      const match = constraintMessage.match(/no less than (\d+)/i);
      return match
        ? `Debe indicar al menos ${match[1]} elemento(s) en ${field}`
        : `La lista ${field} tiene pocos elementos`;
    }
    case 'arrayMaxSize': {
      const match = constraintMessage.match(/no more than (\d+)/i);
      return match
        ? `La lista ${field} no puede tener más de ${match[1]} elemento(s)`
        : `La lista ${field} tiene demasiados elementos`;
    }
    case 'whitelistValidation':
      return `La propiedad ${property} no está permitida`;
    default:
      return `El campo ${field} no es válido`;
  }
}

function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): string[] {
  const messages: string[] = [];

  for (const error of errors) {
    const propertyPath = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      for (const [key, raw] of Object.entries(error.constraints)) {
        messages.push(messageForConstraint(error.property, key, raw));
      }
    }

    if (error.children?.length) {
      messages.push(...flattenValidationErrors(error.children, propertyPath));
    }
  }

  return messages;
}

/** Traduce mensajes típicos de class-validator / Nest que aún vengan en inglés. */
export function traducirMensajeValidacionIngles(message: string): string {
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
      /^(.+) must be an integer number$/i,
      (m) => `El campo ${labelFor(m[1])} debe ser un número entero`,
    ],
    [
      /^(.+) must be a boolean value$/i,
      (m) => `El campo ${labelFor(m[1])} debe ser verdadero o falso`,
    ],
    [
      /^(.+) must be a valid enum value$/i,
      (m) => `El valor de ${labelFor(m[1])} no es válido`,
    ],
    [
      /^(.+) must be a valid ISO 8601 date string$/i,
      (m) => `El campo ${labelFor(m[1])} debe ser una fecha válida`,
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
    [
      /^(.+) must be a positive number$/i,
      (m) => `El campo ${labelFor(m[1])} debe ser un número positivo`,
    ],
    [
      /^(.+) must be an array$/i,
      (m) => `El campo ${labelFor(m[1])} debe ser una lista`,
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

export function validationExceptionFactory(errors: ValidationError[]): BadRequestException {
  const messages = flattenValidationErrors(errors);
  const message =
    messages.length > 0
      ? messages.join('. ')
      : 'Los datos enviados no son válidos';

  return new BadRequestException({
    errorCode: ErrorCode.VALIDATION_ERROR,
    message,
    statusCode: 400,
  });
}
