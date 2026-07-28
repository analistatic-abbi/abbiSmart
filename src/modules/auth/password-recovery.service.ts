import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuditAccion,
  AuditEntidadTipo,
} from '../../common/enums/audit-accion.enum';
import { EstadoUsuario } from '../../common/enums/estado-usuario.enum';
import { Usuario } from '../../database/entities/usuario.entity';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { ActivationService } from './activation.service';

const GENERIC_MESSAGE =
  'Si el correo está registrado, recibirá instrucciones en breve.';

@Injectable()
export class PasswordRecoveryService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly activationService: ActivationService,
    private readonly mailService: MailService,
    private readonly auditService: AuditService,
  ) {}

  async requestForgotPassword(correo: string): Promise<{ message: string }> {
    const usuario = await this.usuarioRepository.findOne({
      where: { correo: correo.trim(), eliminado: false },
    });

    if (!usuario || usuario.estado === EstadoUsuario.BLOQUEADA) {
      return { message: GENERIC_MESSAGE };
    }

    const rawToken = await this.activationService.createActivationToken(usuario.id);

    if (usuario.estado === EstadoUsuario.INACTIVO) {
      await this.mailService.sendActivationEmail(
        usuario.correo,
        usuario.nombre,
        rawToken,
      );
    } else {
      await this.mailService.sendPasswordResetEmail(
        usuario.correo,
        usuario.nombre,
        rawToken,
      );
    }

    await this.auditService.log({
      usuarioId: usuario.id,
      accion: AuditAccion.RESET_PASSWORD_SOLICITUD,
      entidadTipo: AuditEntidadTipo.USUARIO,
      entidadId: usuario.id,
      valorNuevo: JSON.stringify({ origen: 'forgot-password' }),
    });

    return { message: GENERIC_MESSAGE };
  }
}
