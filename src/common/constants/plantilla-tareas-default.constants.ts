import { TareaCodigo } from '../enums/tarea-codigo.enum';

export interface PlantillaTareaDefault {
  codigo: string;
  nombre: string;
  orden: number;
  aplicaRfi: boolean;
  requiereFechaAdquisicion: boolean;
}

export const PLANTILLA_TAREAS_DEFAULT: PlantillaTareaDefault[] = [
  {
    codigo: TareaCodigo.CREACION_CARPETA,
    nombre: 'Creación de carpeta',
    orden: 1,
    aplicaRfi: true,
    requiereFechaAdquisicion: false,
  },
  {
    codigo: TareaCodigo.MANIFESTACION_INTERES,
    nombre: 'Manifestación de interés',
    orden: 2,
    aplicaRfi: true,
    requiereFechaAdquisicion: false,
  },
  {
    codigo: TareaCodigo.ADQUISICION_DERECHO,
    nombre: 'Adquisición derecho a participar',
    orden: 3,
    aplicaRfi: true,
    requiereFechaAdquisicion: true,
  },
  {
    codigo: TareaCodigo.PREPARAR_DOC_JURIDICA,
    nombre: 'Preparar documentación jurídica',
    orden: 4,
    aplicaRfi: true,
    requiereFechaAdquisicion: false,
  },
  {
    codigo: TareaCodigo.PREPARAR_DOC_TECNICA,
    nombre: 'Preparar documentación técnica',
    orden: 5,
    aplicaRfi: true,
    requiereFechaAdquisicion: false,
  },
  {
    codigo: TareaCodigo.PREPARAR_DOC_FINANCIERA,
    nombre: 'Preparar documentación financiera',
    orden: 6,
    aplicaRfi: true,
    requiereFechaAdquisicion: false,
  },
  {
    codigo: TareaCodigo.ESTRUCTURACION_ADMIN,
    nombre: 'Estructuración de administración',
    orden: 7,
    aplicaRfi: true,
    requiereFechaAdquisicion: false,
  },
  {
    codigo: TareaCodigo.SOLICITUD_PAGO_POLIZA,
    nombre: 'Solicitud de pago de póliza',
    orden: 8,
    aplicaRfi: false,
    requiereFechaAdquisicion: false,
  },
  {
    codigo: TareaCodigo.PAGO_POLIZA,
    nombre: 'Pago de póliza',
    orden: 9,
    aplicaRfi: false,
    requiereFechaAdquisicion: false,
  },
  {
    codigo: TareaCodigo.ELABORACION_PROPUESTA,
    nombre: 'Elaboración de propuesta económica',
    orden: 10,
    aplicaRfi: true,
    requiereFechaAdquisicion: false,
  },
  {
    codigo: TareaCodigo.VALIDACION_AREA_TECNICA,
    nombre: 'Validación área técnica',
    orden: 11,
    aplicaRfi: true,
    requiereFechaAdquisicion: false,
  },
  {
    codigo: TareaCodigo.ENVIO_PROPUESTA,
    nombre: 'Envío de propuesta',
    orden: 12,
    aplicaRfi: true,
    requiereFechaAdquisicion: false,
  },
];
