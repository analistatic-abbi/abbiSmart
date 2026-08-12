import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { Pais } from '../../database/entities/pais.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { AuthUserPayload } from '../auth/interfaces/auth-user-payload.interface';
import { MondayService } from '../monday/monday.service';
import { EnviarSoporteDto } from './dto/enviar-soporte.dto';

@Injectable()
export class SoporteService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Pais)
    private readonly paisRepository: Repository<Pais>,
    private readonly mondayService: MondayService,
  ) {}

  async enviarMensaje(
    actor: AuthUserPayload,
    dto: EnviarSoporteDto,
  ): Promise<{ message: string }> {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: actor.userId, eliminado: false },
    });

    if (!usuario) {
      throw new BusinessException(
        ErrorCode.USUARIO_NO_ENCONTRADO,
        'Usuario no encontrado',
      );
    }

    const paisSesionNombre = await this.resolvePaisNombre(actor.paisSesionId);
    const tipoSolicitud = (dto.categoria ?? 'Otro').trim() || 'Otro';
    const descripcion = this.buildDescripcion(dto);

    await this.mondayService.createSupportTicket({
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: String(usuario.rol),
      sede: paisSesionNombre,
      tipoSolicitud,
      descripcion,
    });

    return {
      message: 'Su solicitud fue registrada en el centro de soporte.',
    };
  }

  private buildDescripcion(dto: EnviarSoporteDto): string {
    const parts: string[] = [];
    const asunto = dto.asunto?.trim();
    if (asunto) {
      parts.push(`Asunto: ${asunto}`);
    }
    parts.push(dto.mensaje.trim());
    const pagina = dto.paginaActual?.trim();
    if (pagina) {
      parts.push(`Página: ${pagina}`);
    }
    return parts.join('\n\n');
  }

  private async resolvePaisNombre(
    paisSesionId: number | null | undefined,
  ): Promise<string | null> {
    if (paisSesionId == null) {
      return null;
    }

    const pais = await this.paisRepository.findOne({
      where: { id: Number(paisSesionId) },
    });

    return pais?.nombre ?? null;
  }
}
