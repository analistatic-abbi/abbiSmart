import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface SupportRequestEmailInput {
  nombre: string;
  correo: string;
  rol: string;
  paisSesionNombre?: string | null;
  categoria?: string;
  asunto?: string;
  mensaje: string;
  paginaActual?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  shouldExposeDevTokens(): boolean {
    const host = this.configService.get<string>('mail.host');
    const nodeEnv = this.configService.get<string>('app.nodeEnv');
    return !host && nodeEnv === 'development';
  }

  async sendActivationEmail(
    to: string,
    nombre: string,
    rawToken: string,
  ): Promise<void> {
    const activationUrl = this.buildAppUrl('/activate', { token: rawToken });
    const subject = 'Active su cuenta — Smart Licitaciones ABBI';
    const text = [
      `Hola ${nombre},`,
      '',
      'Se ha creado su cuenta en Smart Licitaciones ABBI.',
      'Para activarla, defina su contraseña en el siguiente enlace:',
      '',
      activationUrl,
      '',
      'Este enlace expira en 48 horas y solo puede usarse una vez.',
    ].join('\n');

    await this.sendOrWarn(to, subject, text, `activación: ${activationUrl}`);
  }

  async sendPasswordResetEmail(
    to: string,
    nombre: string,
    rawToken: string,
  ): Promise<void> {
    const resetUrl = this.buildAppUrl('/reset-password', { token: rawToken });
    const subject = 'Restablecer contraseña — Smart Licitaciones ABBI';
    const text = [
      `Hola ${nombre},`,
      '',
      'Se solicitó el restablecimiento de su contraseña en Smart Licitaciones ABBI.',
      'Para definir una nueva contraseña, use el siguiente enlace:',
      '',
      resetUrl,
      '',
      'Este enlace expira en 48 horas y solo puede usarse una vez.',
      'Si no solicitó este cambio, ignore este correo.',
    ].join('\n');

    await this.sendOrWarn(to, subject, text, `restablecimiento: ${resetUrl}`);
  }

  async sendValidacionAsignadaEmail(
    to: string,
    nombre: string,
    codigoProceso: string,
  ): Promise<void> {
    const subject = 'Proceso pendiente de validación — Smart Licitaciones ABBI';
    const text = [
      `Hola ${nombre},`,
      '',
      `Se le asignó el proceso ${codigoProceso} para validación.`,
      'Ingrese al sistema para revisar la documentación y emitir su veredicto.',
    ].join('\n');

    await this.sendOrWarn(
      to,
      subject,
      text,
      `validación asignada para proceso ${codigoProceso}`,
    );
  }

  async sendSupportRequestEmail(input: SupportRequestEmailInput): Promise<void> {
    const supportTo = this.configService.get<string>('mail.supportTo');
    if (!supportTo) {
      this.logger.warn('MAIL_SUPPORT_TO no configurado — solicitud de soporte no enviada');
      return;
    }

    const categoria = input.categoria?.trim() || 'General';
    const asuntoUsuario = input.asunto?.trim() || 'Sin asunto';
    const subject = `[Smart Licitaciones] Soporte — ${categoria} — ${input.nombre}`;
    const text = [
      'Nueva solicitud de soporte desde Smart Licitaciones ABBI',
      '',
      `Nombre: ${input.nombre}`,
      `Correo: ${input.correo}`,
      `Rol: ${input.rol}`,
      `País de sesión: ${input.paisSesionNombre?.trim() || 'N/A'}`,
      `Categoría: ${categoria}`,
      `Asunto: ${asuntoUsuario}`,
      input.paginaActual ? `Pantalla: ${input.paginaActual}` : '',
      '',
      'Mensaje:',
      input.mensaje,
    ]
      .filter(Boolean)
      .join('\n');

    await this.sendOrWarn(
      supportTo,
      subject,
      text,
      `soporte de ${input.correo}`,
      input.correo,
    );
  }

  async sendSupportAckEmail(
    to: string,
    nombre: string,
    asunto?: string,
  ): Promise<void> {
    const subject = 'Recibimos su solicitud de soporte — Smart Licitaciones ABBI';
    const text = [
      `Hola ${nombre},`,
      '',
      'Hemos recibido su mensaje de soporte. Nuestro equipo lo revisará y se comunicará con usted si es necesario.',
      asunto?.trim() ? `Asunto: ${asunto.trim()}` : '',
      '',
      'Gracias por usar Smart Licitaciones ABBI.',
    ]
      .filter(Boolean)
      .join('\n');

    await this.sendOrWarn(to, subject, text, `acuse de soporte a ${to}`);
  }

  private buildAppUrl(path: string, query: Record<string, string>): string {
    const frontendUrl = (
      this.configService.get<string>('mail.frontendUrl') ?? 'http://127.0.0.1:4200'
    ).replace(/\/$/, '');
    const params = new URLSearchParams(query);
    return `${frontendUrl}${path.startsWith('/') ? path : `/${path}`}?${params.toString()}`;
  }

  private resolveFromAddress(): string {
    const from = this.configService.get<string>('mail.from') ?? 'noreply@abbi.com';
    const fromName =
      this.configService.get<string>('mail.fromName') ?? 'Notificaciones ABBI Smart';
    return `"${fromName}" <${from}>`;
  }

  private async sendOrWarn(
    to: string,
    subject: string,
    text: string,
    logContext: string,
    replyTo?: string,
  ): Promise<void> {
    const host = this.configService.get<string>('mail.host');

    if (!host) {
      this.logger.warn(`MAIL_HOST no configurado — ${logContext}`);
      return;
    }

    const transporter = this.getTransporter();
    await transporter.sendMail({
      from: this.resolveFromAddress(),
      to,
      subject,
      text,
      ...(replyTo ? { replyTo } : {}),
    });
    this.logger.log(`Correo enviado a ${to}: ${subject}`);
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      const port = this.configService.get<number>('mail.port') ?? 587;
      const secure =
        this.configService.get<boolean>('mail.secure') ?? port === 465;

      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('mail.host'),
        port,
        secure,
        auth: {
          user: this.configService.get<string>('mail.user'),
          pass: this.configService.get<string>('mail.password'),
        },
      });
    }

    return this.transporter;
  }
}
