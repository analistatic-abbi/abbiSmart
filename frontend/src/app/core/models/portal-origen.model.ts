export enum PortalOrigen {
  LicitacionesInfo = 'licitaciones.info',
  Suplos = 'suplos',
  Strateggi = 'strateggi',
  InvitacionDirecta = 'invitacion_directa',
  Otro = 'otro',
}

export const PORTAL_ORIGEN_OPCIONES: Array<{ value: PortalOrigen; label: string }> = [
  { value: PortalOrigen.LicitacionesInfo, label: 'licitaciones.info' },
  { value: PortalOrigen.Suplos, label: 'suplos' },
  { value: PortalOrigen.Strateggi, label: 'strateggi' },
  { value: PortalOrigen.InvitacionDirecta, label: 'invitación directa' },
  { value: PortalOrigen.Otro, label: 'otro' },
];
