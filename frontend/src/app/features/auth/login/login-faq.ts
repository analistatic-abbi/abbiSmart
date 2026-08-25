export interface LoginFaqItem {
  id: string;
  question: string;
  answer: string;
}

export const LOGIN_FAQ_ITEMS: LoginFaqItem[] = [
  {
    id: 'acceso',
    question: '¿Cómo accedo al sistema?',
    answer:
      'Use el correo corporativo registrado por su administrador y la contraseña que definió al activar la cuenta. Si es su primer ingreso, revise su bandeja de entrada por el correo de activación.',
  },
  {
    id: 'olvido',
    question: '¿Olvidé mi contraseña?',
    answer:
      'Use el enlace «¿Olvidaste tu contraseña?» en esta pantalla. Si el correo está registrado y la cuenta no está bloqueada, recibirá un enlace para restablecerla.',
  },
  {
    id: 'activacion',
    question: '¿No recibí el correo de activación?',
    answer:
      'Revise la carpeta de spam. Si su cuenta sigue inactiva, solicite al administrador que reenvíe la invitación o use «¿Olvidaste tu contraseña?» con su correo para recibir un nuevo enlace.',
  },
  {
    id: 'bloqueada',
    question: '¿Mi cuenta está bloqueada?',
    answer:
      'Tras varios intentos fallidos de inicio de sesión la cuenta se bloquea por seguridad. En ese caso debe contactar a un administrador del sistema; el restablecimiento automático no envía correo.',
  },
  {
    id: 'soporte',
    question: '¿Cómo reporto un problema o solicito soporte?',
    answer:
      'Use el botón «Ir al HelpDesk TIC» al final de este panel. Abrirá el formulario de tickets (Jotform) para registrar su solicitud; no necesita haber iniciado sesión.',
  },
];
