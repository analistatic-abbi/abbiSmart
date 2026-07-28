import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pais } from '../../database/entities/pais.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { MailService } from '../mail/mail.service';
import { AuthUserPayload } from '../auth/interfaces/auth-user-payload.interface';
import { EnviarSoporteDto } from './dto/enviar-soporte.dto';

@Injectable()
export class SoporteService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Pais)
    private readonly paisRepository: Repository<Pais>,
    private readonly mailService: MailService,
  ) {}

  async enviarMensaje(
    actor: AuthUserPayload,
    dto: EnviarSoporteDto,
  ): Promise<{ message: string }> {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: actor.userId, eliminado: false },
    });

    if (!usuario) {
      return {
        message:
          'Su solicitud fue registrada. Si el correo está configurado, recibirá confirmación.',
      };
    }

    const paisSesionNombre = await this.resolvePaisNombre(actor.paisSesionId);

    await this.mailService.sendSupportRequestEmail({
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
      paisSesionNombre,
      categoria: dto.categoria,
      asunto: dto.asunto,
      mensaje: dto.mensaje.trim(),
      paginaActual: dto.paginaActual,
    });

    await this.mailService.sendSupportAckEmail(
      usuario.correo,
      usuario.nombre,
      dto.asunto,
    );

    return {
      message:
        'Su solicitud fue enviada. Revise su correo para la confirmación de recepción.',
    };
  }

  private async resolvePaisNombre(paisSesionId: number | null | undefined): Promise<string | null> {
    if (paisSesionId == null) {
      return null;
    }

    const pais = await this.paisRepository.findOne({
      where: { id: Number(paisSesionId) },
    });

    return pais?.nombre ?? null;
  }
}
