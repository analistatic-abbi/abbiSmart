import { HttpStatus } from '@nestjs/common';
import { BusinessException } from '../exceptions/business.exception';
import { ErrorCode } from '../exceptions/error-codes.enum';

export interface FechasProcesoInput {
  fechaApertura: string;
  fechaCierre: string;
  fechaManifestacionInteres?: string | null;
  fechaAdquisicionDerecho?: string | null;
  fechaReunionAclaratoria?: string | null;
  fechaVisitaTecnica?: string | null;
  fechaSolicitudesAclaracion?: string | null;
  fechaRespuestaAclaracion?: string | null;
  fechaLimitacionMypymes?: string | null;
}

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

export function validateFechasEnRango(fechas: FechasProcesoInput): void {
  const apertura = parseDate(fechas.fechaApertura);
  const cierre = parseDate(fechas.fechaCierre);

  if (cierre < apertura) {
    throw new BusinessException(
      ErrorCode.PROCESO_FECHAS_FUERA_RANGO,
      'La fecha de cierre no puede ser anterior a la fecha de apertura',
      HttpStatus.BAD_REQUEST,
    );
  }

  const opcionales: Array<[string, string | null | undefined]> = [
    ['Manifestación de interés', fechas.fechaManifestacionInteres],
    ['Adquisición de derecho', fechas.fechaAdquisicionDerecho],
    ['Reunión aclaratoria', fechas.fechaReunionAclaratoria],
    ['Visita técnica', fechas.fechaVisitaTecnica],
    ['Solicitudes de aclaración', fechas.fechaSolicitudesAclaracion],
    ['Respuesta a aclaración', fechas.fechaRespuestaAclaracion],
    ['Limitación MyPymes', fechas.fechaLimitacionMypymes],
  ];

  for (const [label, valor] of opcionales) {
    if (!valor) {
      continue;
    }

    const fecha = parseDate(valor);

    if (fecha < apertura || fecha > cierre) {
      throw new BusinessException(
        ErrorCode.PROCESO_FECHAS_FUERA_RANGO,
        `La fecha de ${label} debe estar entre apertura y cierre`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}

export function tieneFechasOpcionales(fechas: FechasProcesoInput): boolean {
  return Boolean(
    fechas.fechaManifestacionInteres ||
      fechas.fechaAdquisicionDerecho ||
      fechas.fechaReunionAclaratoria ||
      fechas.fechaVisitaTecnica ||
      fechas.fechaSolicitudesAclaracion ||
      fechas.fechaRespuestaAclaracion ||
      fechas.fechaLimitacionMypymes,
  );
}
