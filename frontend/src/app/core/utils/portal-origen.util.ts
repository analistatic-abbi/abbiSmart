import { PortalOrigen, PORTAL_ORIGEN_OPCIONES } from '../models/portal-origen.model';

export function portalOrigenLabel(
  portalOrigen: string | null | undefined,
  portalOrigenOtro?: string | null,
): string {
  if (!portalOrigen) {
    return '—';
  }

  if (portalOrigen === PortalOrigen.Otro) {
    return portalOrigenOtro?.trim() || 'otro';
  }

  const opcion = PORTAL_ORIGEN_OPCIONES.find((item) => item.value === portalOrigen);
  return opcion?.label ?? portalOrigen;
}
