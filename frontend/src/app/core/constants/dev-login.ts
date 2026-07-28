export interface DevLoginAccount {
  label: string;
  correo: string;
  password: string;
}

/** Credenciales demo para acelerar pruebas locales. No usar en producción. */
export const DEV_LOGIN_ACCOUNTS: DevLoginAccount[] = [
  { label: 'Admin', correo: 'admin@abbi.com', password: 'Admin1234' },
  { label: 'Supervisor', correo: 'supervisor@abbi.com', password: 'Admin1234' },
  { label: 'Validador', correo: 'validador@abbi.com', password: 'Admin1234' },
  { label: 'Visitante', correo: 'visitante@abbi.com', password: 'Admin1234' },
  { label: 'Operador CO', correo: 'operador.co@abbi.com', password: 'Admin1234' },
  { label: 'Operador PE', correo: 'operador.pe@abbi.com', password: 'Admin1234' },
];
