/** Etiquetas legibles en español para códigos de tarea (SEG-001). */
export const TAREA_LABELS: Record<string, string> = {
  Creacion_Carpeta: 'Creación de carpeta',
  Manifestacion_Interes: 'Manifestación de interés',
  Adquisicion_Derecho_Participar: 'Adquisición derecho a participar',
  Preparar_Doc_Juridica: 'Preparar documentación jurídica',
  Preparar_Doc_Tecnica: 'Preparar documentación técnica',
  Preparar_Doc_Financiera: 'Preparar documentación financiera',
  Estructuracion_Administracion: 'Estructuración de administración',
  Solicitud_Pago_Poliza: 'Solicitud de pago de póliza',
  Pago_Poliza: 'Pago de póliza',
  Elaboracion_Propuesta_Economica: 'Elaboración de propuesta económica',
  Validacion_Area_Tecnica: 'Validación área técnica',
  Envio_Propuesta: 'Envío de propuesta',
};

export function labelTarea(codigo: string): string {
  return TAREA_LABELS[codigo] ?? codigo.replaceAll('_', ' ');
}
