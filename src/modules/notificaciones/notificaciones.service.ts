import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { Notificacion } from '../../database/entities/notificacion.entity';

export interface NotificacionResponseDto {
  id: number;
  tipo: string;
  mensaje: string;
  entidadTipo: string | null;
  entidadId: number | null;
  leida: boolean;
  fechaCreacion: Date;
}

export interface CrearNotificacionInput {
  usuarioId: number;
  tipo: string;
  mensaje: string;
  entidadTipo?: string;
  entidadId?: number;
}

@Injectable()
export class NotificacionesService {
  constructor(
    @InjectRepository(Notificacion)
    private readonly notificacionRepository: Repository<Notificacion>,
  ) {}

  async findByUsuario(
    usuarioId: number,
    soloNoLeidas = false,
  ): Promise<NotificacionResponseDto[]> {
    const notificaciones = await this.notificacionRepository.find({
      where: {
        usuarioId,
        ...(soloNoLeidas ? { leida: false } : {}),
      },
      order: { fechaCreacion: 'DESC' },
      take: 100,
    });

    return notificaciones.map((item) => this.toResponse(item));
  }

  async marcarLeida(id: number, usuarioId: number): Promise<NotificacionResponseDto> {
    const notificacion = await this.notificacionRepository.findOne({
      where: { id, usuarioId },
    });

    if (!notificacion) {
      throw new BusinessException(
        ErrorCode.NOTIFICACION_NO_ENCONTRADA,
        'Notificación no encontrada',
        HttpStatus.NOT_FOUND,
      );
    }

    notificacion.leida = true;
    const saved = await this.notificacionRepository.save(notificacion);
    return this.toResponse(saved);
  }

  async marcarTodasLeidas(usuarioId: number): Promise<number> {
    const result = await this.notificacionRepository.update(
      { usuarioId, leida: false },
      { leida: true },
    );

    return result.affected ?? 0;
  }

  async crear(input: CrearNotificacionInput): Promise<NotificacionResponseDto> {
    const notificacion = this.notificacionRepository.create({
      usuarioId: input.usuarioId,
      tipo: input.tipo,
      mensaje: input.mensaje,
      entidadTipo: input.entidadTipo ?? null,
      entidadId: input.entidadId ?? null,
      leida: false,
    });

    const saved = await this.notificacionRepository.save(notificacion);
    return this.toResponse(saved);
  }

  private toResponse(notificacion: Notificacion): NotificacionResponseDto {
    return {
      id: notificacion.id,
      tipo: notificacion.tipo,
      mensaje: notificacion.mensaje,
      entidadTipo: notificacion.entidadTipo,
      entidadId: notificacion.entidadId,
      leida: notificacion.leida,
      fechaCreacion: notificacion.fechaCreacion,
    };
  }
}
