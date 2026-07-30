import { LogAuditoria } from '../../../database/entities/log-auditoria.entity';
import {
  formatDetalleAuditoria,
  labelAccionAuditoria,
  labelEntidadAuditoria,
} from '../../../common/utils/audit-labels.util';

export class AuditLogResponseDto {
  id: number;
  usuarioId: number | null;
  usuarioNombre: string | null;
  accion: string;
  accionLabel: string;
  entidadTipo: string;
  entidadId: number | null;
  entidadLabel: string;
  campo: string | null;
  valorAnterior: string | null;
  valorNuevo: string | null;
  detalle: string | null;
  fechaHora: Date;

  static fromEntity(
    log: LogAuditoria,
    paisNombres?: Record<string, string>,
  ): AuditLogResponseDto {
    return {
      id: log.id,
      usuarioId: log.usuarioId,
      usuarioNombre: log.usuario?.nombre ?? null,
      accion: log.accion,
      accionLabel: labelAccionAuditoria(log.accion),
      entidadTipo: log.entidadTipo,
      entidadId: log.entidadId,
      entidadLabel: labelEntidadAuditoria(log.entidadTipo, log.entidadId),
      campo: log.campo,
      valorAnterior: log.valorAnterior,
      valorNuevo: log.valorNuevo,
      detalle: formatDetalleAuditoria(log, paisNombres),
      fechaHora: log.fechaHora,
    };
  }
}
