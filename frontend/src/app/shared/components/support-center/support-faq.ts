export interface SupportFaqItem {
  id: string;
  question: string;
  answer: string;
}

export const SUPPORT_FAQ_ITEMS: SupportFaqItem[] = [
  {
    id: 'procesos',
    question: '¿Cómo registro o consulto un proceso?',
    answer:
      'En «Panel de procesos» puede buscar por código o empresa. Los usuarios con permiso de escritura pueden crear procesos desde «Nuevo proceso» y completar la información en los pasos del formulario.',
  },
  {
    id: 'validacion',
    question: '¿Quién valida un proceso?',
    answer:
      'Los validadores asignados reciben notificación en el sistema y por correo. Desde «Validación» pueden revisar documentación y aprobar o rechazar según corresponda.',
  },
  {
    id: 'proyecciones',
    question: '¿Cómo funcionan las proyecciones?',
    answer:
      'Las proyecciones permiten planificar oportunidades comerciales. Consulte «Gestión de Proyecciones» para listar, crear o ver el calendario. Algunas acciones (cerrar proyección, asignar mercado) requieren rol de Administrador o Supervisor.',
  },
  {
    id: 'pais',
    question: '¿Puedo cambiar el país de sesión?',
    answer:
      'Sí, si su rol lo permite (no aplica a Operador). Use el selector de país en la barra superior. Al cambiar de país se actualiza el contexto de los datos que ve en el sistema.',
  },
  {
    id: 'permisos',
    question: 'No veo un menú o acción esperada',
    answer:
      'Las opciones del menú dependen de su rol y de la configuración del sistema (por ejemplo, carga masiva). Si necesita un permiso adicional, indíquelo en el formulario de soporte.',
  },
  {
    id: 'respuesta',
    question: '¿Cuándo recibiré respuesta?',
    answer:
      'Al enviar su solicitud recibirá un correo de confirmación. El equipo de soporte revisará su mensaje y se comunicará con usted si requiere seguimiento.',
  },
];

export const SUPPORT_CATEGORIAS = [
  'Acceso y cuenta',
  'Procesos y validación',
  'Proyecciones',
  'CRM (clientes/contactos)',
  'Configuración / permisos',
  'Otro',
] as const;
