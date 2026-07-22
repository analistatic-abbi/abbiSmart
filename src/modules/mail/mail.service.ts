import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

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
    const frontendUrl = this.configService.get<string>('mail.frontendUrl');
    const activationUrl = `${frontendUrl}/activate?token=${rawToken}`;
    const from = this.configService.get<string>('mail.from') ?? 'noreply@abbi.com';

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

    const host = this.configService.get<string>('mail.host');

    if (!host) {
      this.logger.warn(
        `MAIL_HOST no configurado — enlace de activación para ${to}: ${activationUrl}`,
      );
      return;
    }

    const transporter = this.getTransporter();
    await transporter.sendMail({ from, to, subject, text });
    this.logger.log(`Correo de activación enviado a ${to}`);
  }

  async sendPasswordResetEmail(
    to: string,
    nombre: string,
    rawToken: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('mail.frontendUrl');
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;
    const from = this.configService.get<string>('mail.from') ?? 'noreply@abbi.com';

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

    const host = this.configService.get<string>('mail.host');

    if (!host) {
      this.logger.warn(
        `MAIL_HOST no configurado — enlace de restablecimiento para ${to}: ${resetUrl}`,
      );
      return;
    }

    const transporter = this.getTransporter();
    await transporter.sendMail({ from, to, subject, text });
    this.logger.log(`Correo de restablecimiento enviado a ${to}`);
  }

  async sendValidacionAsignadaEmail(
    to: string,
    nombre: string,
    codigoProceso: string,
  ): Promise<void> {
    const from = this.configService.get<string>('mail.from') ?? 'noreply@abbi.com';
    const subject = 'Proceso pendiente de validación — Smart Licitaciones ABBI';
    const text = [
      `Hola ${nombre},`,
      '',
      `Se le asignó el proceso ${codigoProceso} para validación.`,
      'Ingrese al sistema para revisar la documentación y emitir su veredicto.',
    ].join('\n');

    const host = this.configService.get<string>('mail.host');

    if (!host) {
      this.logger.warn(
        `MAIL_HOST no configurado — validación asignada a ${to} para proceso ${codigoProceso}`,
      );
      return;
    }

    const transporter = this.getTransporter();
    await transporter.sendMail({ from, to, subject, text });
    this.logger.log(`Correo de validación enviado a ${to}`);
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('mail.host'),
        port: this.configService.get<number>('mail.port'),
        secure: this.configService.get<number>('mail.port') === 465,
        auth: {
          user: this.configService.get<string>('mail.user'),
          pass: this.configService.get<string>('mail.password'),
        },
      });
    }

    return this.transporter;
  }
}
