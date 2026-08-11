import { HttpStatus } from '@nestjs/common';
import { BusinessException } from '../exceptions/business.exception';
import { ErrorCode } from '../exceptions/error-codes.enum';
import { PortalOrigen, PORTAL_ORIGEN_LABELS } from '../enums/portal-origen.enum';

export function portalOrigenMostrar(
  portalOrigen: string | null | undefined,
  portalOrigenOtro: string | null | undefined,
): string | null {
  if (!portalOrigen) {
    return null;
  }

  if (portalOrigen === PortalOrigen.Otro) {
    return portalOrigenOtro?.trim() || PORTAL_ORIGEN_LABELS[PortalOrigen.Otro];
  }

  return PORTAL_ORIGEN_LABELS[portalOrigen as PortalOrigen] ?? portalOrigen;
}

export function validatePortalOrigen(
  portalOrigen?: string | null,
  portalOrigenOtro?: string | null,
): void {
  if (!portalOrigen) {
    return;
  }

  const valores = Object.values(PortalOrigen);
  if (!valores.includes(portalOrigen as PortalOrigen)) {
    throw new BusinessException(
      ErrorCode.VALIDATION_ERROR,
      `Portal de origen inválido. Valores permitidos: ${valores.join(', ')}`,
      HttpStatus.BAD_REQUEST,
    );
  }

  if (portalOrigen === PortalOrigen.Otro && !portalOrigenOtro?.trim()) {
    throw new BusinessException(
      ErrorCode.VALIDATION_ERROR,
      'Debe indicar el portal de origen cuando selecciona "otro"',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export function normalizePortalOrigenOtro(
  portalOrigen?: string | null,
  portalOrigenOtro?: string | null,
): string | null {
  if (portalOrigen === PortalOrigen.Otro) {
    return portalOrigenOtro?.trim() ?? null;
  }

  return null;
}
