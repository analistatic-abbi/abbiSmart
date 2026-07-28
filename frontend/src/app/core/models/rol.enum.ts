export enum Rol {
  Administrador = 'Administrador',
  SupervisorSistema = 'Supervisor del Sistema',
  Operador = 'Operador',
  Visitante = 'Visitante',
  Validador = 'Validador',
}

export enum ErrorCode {
  AuthCredencialesInvalidas = 'AUTH_CREDENCIALES_INVALIDAS',
  AuthCuentaBloqueada = 'AUTH_CUENTA_BLOQUEADA',
  PermisoDenegado = 'PERMISO_DENEGADO',
  PaisSesionRequerido = 'PAIS_SESION_REQUERIDO',
}
