import { CargaMasivaDetalleCreado } from '../models/carga-masiva.model';

export function rutaRegistroCreado(
  entidadTipo: string,
  item: CargaMasivaDetalleCreado,
): string | null {
  switch (entidadTipo) {
    case 'cliente':
      return `/crm/clientes/${item.entidadId}`;
    case 'contacto':
      return item.clienteId
        ? `/crm/clientes/${item.clienteId}`
        : `/crm/contactos/${item.entidadId}/editar`;
    case 'proyeccion':
      return `/proyecciones/${item.entidadId}`;
    default:
      return null;
  }
}

export function etiquetaEntidadCarga(entidadTipo: string): string {
  switch (entidadTipo) {
    case 'cliente':
      return 'Clientes';
    case 'contacto':
      return 'Contactos';
    case 'proyeccion':
      return 'Proyecciones';
    default:
      return entidadTipo;
  }
}

export function requiereConfirmacionDependientes(entidadTipo: string): boolean {
  return entidadTipo === 'cliente' || entidadTipo === 'proyeccion';
}
