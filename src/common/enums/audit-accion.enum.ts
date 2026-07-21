export enum AuditAccion {
  LOGIN = 'login',
  LOGOUT = 'logout',
  LOGIN_FALLIDO = 'login_fallido',
  CUENTA_BLOQUEADA = 'cuenta_bloqueada',
  ACTIVACION = 'activacion',
  RESET_PASSWORD = 'reset_password',
  RESET_PASSWORD_SOLICITUD = 'reset_password_solicitud',
  USUARIO_CREAR = 'usuario_crear',
  USUARIO_EDITAR = 'usuario_editar',
  USUARIO_DESBLOQUEAR = 'usuario_desbloquear',
}

export enum AuditEntidadTipo {
  AUTH = 'auth',
  USUARIO = 'usuario',
}
