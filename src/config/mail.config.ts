import { registerAs } from '@nestjs/config';

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') {
    return fallback;
  }
  return value === 'true' || value === '1';
}

export default registerAs('mail', () => {
  const port = parseInt(process.env.MAIL_PORT ?? '587', 10);

  return {
    host: process.env.MAIL_HOST ?? '',
    port,
    secure: parseBoolean(process.env.MAIL_SECURE, port === 465),
    user: process.env.MAIL_USER ?? '',
    password: process.env.MAIL_PASSWORD ?? '',
    from: process.env.MAIL_FROM ?? 'noreply@abbi.com',
    fromName: process.env.MAIL_FROM_NAME ?? 'Notificaciones ABBI Smart',
    supportTo: process.env.MAIL_SUPPORT_TO ?? '',
    frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:4200',
  };
});
