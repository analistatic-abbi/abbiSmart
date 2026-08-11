import { AuditAccion, AuditEntidadTipo } from '../enums/audit-accion.enum';
import {
  logParametroAuditoria,
  parametroAuditSnapshot,
} from './audit-field-diff.util';

describe('audit-field-diff.util', () => {
  it('registra cambios por campo al editar parámetro', async () => {
    const auditService = { log: jest.fn().mockResolvedValue(undefined) };

    await logParametroAuditoria(auditService as never, {
      usuarioId: 1,
      accion: AuditAccion.PARAMETRO_EDITAR,
      entidadId: 16,
      anterior: parametroAuditSnapshot({
        valor: '1.5',
        reglaCumplimiento: 'Mayor o igual al requerido',
        anio: 2026,
        indicadorCodigo: 'RCI',
      }),
      nuevo: parametroAuditSnapshot({
        valor: '2',
        reglaCumplimiento: 'Mayor o igual al requerido',
        anio: 2026,
        indicadorCodigo: 'RCI',
      }),
    });

    expect(auditService.log).toHaveBeenCalledTimes(1);
    expect(auditService.log).toHaveBeenCalledWith({
      usuarioId: 1,
      accion: AuditAccion.PARAMETRO_EDITAR,
      entidadTipo: AuditEntidadTipo.PARAMETRO_FINANCIERO,
      entidadId: 16,
      campo: 'valor',
      valorAnterior: '1.5',
      valorNuevo: '2',
    });
  });

  it('registra campos iniciales al crear parámetro', async () => {
    const auditService = { log: jest.fn().mockResolvedValue(undefined) };

    await logParametroAuditoria(auditService as never, {
      usuarioId: 1,
      accion: AuditAccion.PARAMETRO_CREAR,
      entidadId: 20,
      nuevo: parametroAuditSnapshot({
        valor: '10',
        reglaCumplimiento: 'Menor o igual al requerido',
        anio: 2026,
      }),
    });

    expect(auditService.log).toHaveBeenCalledTimes(3);
  });
});
