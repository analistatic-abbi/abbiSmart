export enum PortalOrigen {
  LicitacionesInfo = 'licitaciones.info',
  Suplos = 'suplos',
  Strateggi = 'strateggi',
  InvitacionDirecta = 'invitacion_directa',
  Otro = 'otro',
}

export const PORTAL_ORIGEN_LABELS: Record<PortalOrigen, string> = {
  [PortalOrigen.LicitacionesInfo]: 'licitaciones.info',
  [PortalOrigen.Suplos]: 'suplos',
  [PortalOrigen.Strateggi]: 'strateggi',
  [PortalOrigen.InvitacionDirecta]: 'invitación directa',
  [PortalOrigen.Otro]: 'otro',
};
