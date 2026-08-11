import { IndicadorCodigo } from '../models/proceso.model';
import { buildAuditHistorialCambios } from './audit-historial.util';
import { buildParametroHistorialCambios } from './parametro-historial.util';

describe('parametro-historial.util', () => {
  it('describe diff de snapshots JSON', () => {
    const cambios = buildParametroHistorialCambios(
      {
        valorAnterior: JSON.stringify({
          indicadorCodigo: 'RCI',
          valor: '1.5',
          reglaCumplimiento: 'Mayor o igual al requerido',
        }),
        valorNuevo: JSON.stringify({
          indicadorCodigo: 'RCI',
          valor: '2',
          reglaCumplimiento: 'Mayor o igual al requerido',
        }),
      },
      IndicadorCodigo.RCI,
    );

    expect(cambios.some((c) => c.label === 'Valor')).toBeTrue();
  });
});

describe('audit-historial.util', () => {
  it('formatea cambio por campo de fecha', () => {
    const cambios = buildAuditHistorialCambios({
      id: 1,
      usuarioId: 1,
      usuarioNombre: 'Admin',
      accion: 'proceso_fecha_editar',
      accionLabel: 'Edición de fecha de proceso',
      entidadTipo: 'proceso',
      entidadId: 1,
      entidadLabel: 'Proceso #1',
      campo: 'fechaApertura',
      valorAnterior: '2025-01-10',
      valorNuevo: '2025-03-15',
      detalle: null,
      fechaHora: '2026-07-24T12:00:00.000Z',
    });

    expect(cambios[0].label).toBe('Fecha apertura');
    expect(cambios[0].texto).toContain('→');
  });
});
