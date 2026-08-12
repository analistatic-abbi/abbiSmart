export interface CreateSupportTicketInput {
  nombre: string;
  correo: string;
  rol: string;
  sede: string | null;
  tipoSolicitud: string;
  descripcion: string;
}
