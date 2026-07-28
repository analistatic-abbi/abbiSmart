import 'dotenv/config';
import * as nodemailer from 'nodemailer';

async function main(): Promise<void> {
  const host = process.env.MAIL_HOST;
  const port = Number(process.env.MAIL_PORT ?? 465);
  const secure = process.env.MAIL_SECURE === 'true' || port === 465;
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASSWORD;
  const from = process.env.MAIL_FROM ?? user;
  const fromName = process.env.MAIL_FROM_NAME ?? 'Notificaciones ABBI Smart';
  const to = process.env.MAIL_SUPPORT_TO ?? user;

  if (!host || !user || !pass || !to) {
    console.error(
      'Configure MAIL_HOST, MAIL_USER, MAIL_PASSWORD y MAIL_SUPPORT_TO (o MAIL_FROM) en .env',
    );
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  console.log(`Verificando SMTP ${host}:${port} (secure=${secure})...`);
  await transporter.verify();
  console.log('Conexión SMTP OK');

  const info = await transporter.sendMail({
    from: `"${fromName}" <${from}>`,
    to,
    subject: 'Prueba SMTP — Smart Licitaciones',
    text: [
      'Este es un correo de prueba del script scripts/test-smtp.ts.',
      `Fecha: ${new Date().toISOString()}`,
    ].join('\n'),
  });

  console.log(`Correo enviado: ${info.messageId}`);
}

main().catch((error: unknown) => {
  console.error('Error SMTP:', error);
  process.exit(1);
});
