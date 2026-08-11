import { PortalOrigen } from '../enums/portal-origen.enum';
import {
  normalizePortalOrigenOtro,
  portalOrigenMostrar,
  validatePortalOrigen,
} from './portal-origen.util';

describe('portal-origen.util', () => {
  it('should format known portal labels', () => {
    expect(portalOrigenMostrar(PortalOrigen.Suplos, null)).toBe('suplos');
    expect(portalOrigenMostrar(PortalOrigen.InvitacionDirecta, null)).toBe(
      'invitación directa',
    );
  });

  it('should use custom text for otro', () => {
    expect(portalOrigenMostrar(PortalOrigen.Otro, 'Mi portal')).toBe('Mi portal');
  });

  it('should require texto when portal is otro', () => {
    expect(() => validatePortalOrigen(PortalOrigen.Otro, '   ')).toThrow();
    expect(() => validatePortalOrigen(PortalOrigen.Otro, 'Portal X')).not.toThrow();
  });

  it('should clear otro text for non-otro portals', () => {
    expect(
      normalizePortalOrigenOtro(PortalOrigen.Suplos, 'no deberia guardarse'),
    ).toBeNull();
    expect(normalizePortalOrigenOtro(PortalOrigen.Otro, 'Portal X')).toBe('Portal X');
  });
});
