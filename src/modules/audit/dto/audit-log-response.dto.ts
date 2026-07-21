import { LogAuditoria } from '../../../database/entities/log-auditoria.entity';

export class AuditLogResponseDto {
  id: number;
  usuarioId: number | null;
  accion: string;
  entidadTipo: string;
  entidadId: number | null;
  campo: string | null;
  valorAnterior: string | null;
  valorNuevo: string | null;
  fechaHora: Date;

  static fromEntity(log: LogAuditoria): AuditLogResponseDto {
    return {
      id: log.id,
      usuarioId: log.usuarioId,
      accion: log.accion,
      entidadTipo: log.entidadTipo,
      entidadId: log.entidadId,
      campo: log.campo,
      valorAnterior: log.valorAnterior,
      valorNuevo: log.valorNuevo,
      fechaHora: log.fechaHora,
    };
  }
}
