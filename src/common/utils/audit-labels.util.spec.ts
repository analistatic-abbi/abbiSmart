import { AuditAccion } from '../enums/audit-accion.enum';
import {
  formatDetalleAuditoria,
  labelAccionAuditoria,
  labelEntidadAuditoria,
} from './audit-labels.util';

describe('audit-labels.util', () => {
  it('traduce acciones conocidas', () => {
    expect(labelAccionAuditoria(AuditAccion.PROCESO_FECHA_EDITAR)).toBe(
      'Edición de fecha de proceso',
    );
  });

  it('formatea entidad con id', () => {
    expect(labelEntidadAuditoria('proceso', 24)).toBe('Proceso #24');
  });

  it('describe cambio de fecha', () => {
    expect(
      formatDetalleAuditoria({
        accion: AuditAccion.PROCESO_FECHA_EDITAR,
        campo: 'fechaApertura',
        valorAnterior: '2025-01-10',
        valorNuevo: '2025-03-15',
      }),
    ).toBe('Fecha apertura: 10/01/2025 → 15/03/2025');
  });

  it('resuelve país de sesión por id en auditoría', () => {
    expect(
      formatDetalleAuditoria(
        {
          accion: AuditAccion.LOGIN,
          campo: 'pais_sesion',
          valorNuevo: '1',
        },
        { '1': 'Colombia', '2': 'Perú' },
      ),
    ).toBe('País de sesión: — → Colombia');
  });
});
