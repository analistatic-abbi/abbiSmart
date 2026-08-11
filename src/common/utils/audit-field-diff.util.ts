import {
  AuditAccion,
  AuditEntidadTipo,
} from '../enums/audit-accion.enum';
import { AuditService } from '../../modules/audit/audit.service';

export interface ParametroAuditSnapshot {
  valor?: string;
  reglaCumplimiento?: string;
  anio?: number;
  indicadorCodigo?: string;
}

const CAMPOS_PARAMETRO: Array<{
  key: keyof ParametroAuditSnapshot;
  campo: string;
}> = [
  { key: 'valor', campo: 'valor' },
  { key: 'reglaCumplimiento', campo: 'reglaCumplimiento' },
  { key: 'anio', campo: 'anio' },
];

export function parametroAuditSnapshot(input: {
  valor?: string;
  reglaCumplimiento?: string;
  anio?: number;
  indicadorCodigo?: string;
}): ParametroAuditSnapshot {
  return {
    valor: input.valor,
    reglaCumplimiento: input.reglaCumplimiento,
    anio: input.anio,
    indicadorCodigo: input.indicadorCodigo,
  };
}

export async function logParametroAuditoria(
  auditService: AuditService,
  params: {
    usuarioId: number;
    accion:
      | typeof AuditAccion.PARAMETRO_CREAR
      | typeof AuditAccion.PARAMETRO_EDITAR
      | typeof AuditAccion.PARAMETRO_ELIMINAR;
    entidadId: number;
    anterior?: ParametroAuditSnapshot | null;
    nuevo?: ParametroAuditSnapshot | null;
  },
): Promise<void> {
  const { usuarioId, accion, entidadId, anterior, nuevo } = params;

  if (accion === AuditAccion.PARAMETRO_CREAR && nuevo) {
    for (const { key, campo } of CAMPOS_PARAMETRO) {
      const value = nuevo[key];
      if (value === null || value === undefined || value === '') {
        continue;
      }

      await auditService.log({
        usuarioId,
        accion,
        entidadTipo: AuditEntidadTipo.PARAMETRO_FINANCIERO,
        entidadId,
        campo,
        valorNuevo: String(value),
      });
    }

    return;
  }

  if (accion === AuditAccion.PARAMETRO_ELIMINAR && anterior) {
    for (const { key, campo } of CAMPOS_PARAMETRO) {
      const value = anterior[key];
      if (value === null || value === undefined || value === '') {
        continue;
      }

      await auditService.log({
        usuarioId,
        accion,
        entidadTipo: AuditEntidadTipo.PARAMETRO_FINANCIERO,
        entidadId,
        campo,
        valorAnterior: String(value),
      });
    }

    return;
  }

  if (accion === AuditAccion.PARAMETRO_EDITAR && anterior && nuevo) {
    for (const { key, campo } of CAMPOS_PARAMETRO) {
      const prev = anterior[key];
      const next = nuevo[key];

      if (String(prev ?? '') === String(next ?? '')) {
        continue;
      }

      await auditService.log({
        usuarioId,
        accion,
        entidadTipo: AuditEntidadTipo.PARAMETRO_FINANCIERO,
        entidadId,
        campo,
        valorAnterior:
          prev === null || prev === undefined ? null : String(prev),
        valorNuevo:
          next === null || next === undefined ? null : String(next),
      });
    }
  }
}
