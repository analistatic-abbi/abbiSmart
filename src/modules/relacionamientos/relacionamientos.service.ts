import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuditAccion,
  AuditEntidadTipo,
} from '../../common/enums/audit-accion.enum';
import { ResultadoRelacionamiento } from '../../common/enums/resultado-relacionamiento.enum';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { Relacionamiento } from '../../database/entities/relacionamiento.entity';
import { AuditService } from '../audit/audit.service';
import { ContactosService } from '../contactos/contactos.service';
import { CreateRelacionamientoDto } from './dto/create-relacionamiento.dto';
import {
  RelacionamientoResponseDto,
  RelacionamientoVencidoResponseDto,
  RelacionamientosQueryDto,
} from './dto/relacionamiento-response.dto';
import { UpdateRelacionamientoDto } from './dto/update-relacionamiento.dto';

export interface RelacionamientosPage {
  data: RelacionamientoResponseDto[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class RelacionamientosService {
  constructor(
    @InjectRepository(Relacionamiento)
    private readonly relacionamientoRepository: Repository<Relacionamiento>,
    private readonly contactosService: ContactosService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(
    query: RelacionamientosQueryDto,
    paisSesionId: number,
  ): Promise<RelacionamientosPage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.relacionamientoRepository
      .createQueryBuilder('r')
      .innerJoin('r.contacto', 'co')
      .innerJoin('co.cliente', 'cl')
      .where('r.eliminado = false')
      .andWhere('cl.pais_id = :paisSesionId', { paisSesionId });

    if (query.contactoId) {
      qb.andWhere('r.contacto_id = :contactoId', {
        contactoId: query.contactoId,
      });
    }

    qb.orderBy('r.fecha_mensaje', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [relacionamientos, total] = await qb.getManyAndCount();

    return {
      data: relacionamientos.map((item) => this.toResponse(item)),
      total,
      page,
      limit,
    };
  }

  async findVencidos(
    paisSesionId: number,
  ): Promise<RelacionamientoVencidoResponseDto[]> {
    const rows = await this.relacionamientoRepository.query(
      `SELECT
         r.id,
         r.contacto_id AS contactoId,
         r.emisor_usuario_id AS emisorUsuarioId,
         r.canal,
         r.mensaje,
         r.fecha_mensaje AS fechaMensaje,
         r.respuesta,
         r.fecha_respuesta AS fechaRespuesta,
         r.resultado,
         r.fecha_reunion AS fechaReunion,
         v.dias_espera_configurado AS diasEsperaConfigurado,
         v.fecha_limite_respuesta AS fechaLimiteRespuesta
       FROM vista_relacionamientos_vencidos v
       INNER JOIN relacionamientos r ON r.id = v.id
       INNER JOIN contactos co ON co.id = r.contacto_id
       INNER JOIN clientes cl ON cl.id = co.cliente_id
       WHERE cl.pais_id = ?
       ORDER BY v.fecha_limite_respuesta ASC`,
      [paisSesionId],
    );

    return rows as RelacionamientoVencidoResponseDto[];
  }

  async findById(
    id: number,
    paisSesionId: number,
  ): Promise<RelacionamientoResponseDto> {
    const relacionamiento = await this.getActivoOrFail(id, paisSesionId);
    return this.toResponse(relacionamiento);
  }

  async create(
    dto: CreateRelacionamientoDto,
    actorId: number,
    paisSesionId: number,
  ): Promise<RelacionamientoResponseDto> {
    await this.contactosService.getContactoActivoOrFail(
      dto.contactoId,
      paisSesionId,
    );

    this.validateFechaReunion(dto.resultado, dto.fechaReunion);

    const relacionamiento = this.relacionamientoRepository.create({
      contactoId: dto.contactoId,
      emisorUsuarioId: actorId,
      canal: dto.canal,
      mensaje: dto.mensaje,
      fechaMensaje: dto.fechaMensaje,
      resultado: dto.resultado,
      fechaReunion:
        dto.resultado === ResultadoRelacionamiento.REUNION_PROGRAMADA
          ? dto.fechaReunion ?? null
          : null,
      eliminado: false,
    });

    const saved = await this.relacionamientoRepository.save(relacionamiento);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.RELACIONAMIENTO_CREAR,
      entidadTipo: AuditEntidadTipo.RELACIONAMIENTO,
      entidadId: saved.id,
      valorNuevo: JSON.stringify(this.toResponse(saved)),
    });

    return this.toResponse(saved);
  }

  async update(
    id: number,
    dto: UpdateRelacionamientoDto,
    actorId: number,
    paisSesionId: number,
  ): Promise<RelacionamientoResponseDto> {
    const relacionamiento = await this.getActivoOrFail(id, paisSesionId);
    const valorAnterior = JSON.stringify(this.toResponse(relacionamiento));

    const resultado = dto.resultado ?? relacionamiento.resultado;
    const fechaReunion =
      dto.fechaReunion !== undefined
        ? dto.fechaReunion
        : relacionamiento.fechaReunion;

    this.validateFechaReunion(resultado, fechaReunion ?? undefined);

    if (dto.canal !== undefined) relacionamiento.canal = dto.canal;
    if (dto.mensaje !== undefined) relacionamiento.mensaje = dto.mensaje;
    if (dto.fechaMensaje !== undefined) {
      relacionamiento.fechaMensaje = dto.fechaMensaje;
    }
    if (dto.respuesta !== undefined) relacionamiento.respuesta = dto.respuesta;
    if (dto.fechaRespuesta !== undefined) {
      relacionamiento.fechaRespuesta = dto.fechaRespuesta;
    }

    relacionamiento.resultado = resultado;
    relacionamiento.fechaReunion =
      resultado === ResultadoRelacionamiento.REUNION_PROGRAMADA
        ? fechaReunion ?? null
        : null;

    const saved = await this.relacionamientoRepository.save(relacionamiento);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.RELACIONAMIENTO_EDITAR,
      entidadTipo: AuditEntidadTipo.RELACIONAMIENTO,
      entidadId: saved.id,
      valorAnterior,
      valorNuevo: JSON.stringify(this.toResponse(saved)),
    });

    return this.toResponse(saved);
  }

  async softDelete(
    id: number,
    actorId: number,
    paisSesionId: number,
  ): Promise<void> {
    const relacionamiento = await this.getActivoOrFail(id, paisSesionId);

    relacionamiento.eliminado = true;
    relacionamiento.fechaEliminacion = new Date();
    relacionamiento.eliminadoPorId = actorId;

    await this.relacionamientoRepository.save(relacionamiento);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.RELACIONAMIENTO_ELIMINAR,
      entidadTipo: AuditEntidadTipo.RELACIONAMIENTO,
      entidadId: relacionamiento.id,
    });
  }

  private async getActivoOrFail(
    id: number,
    paisSesionId: number,
  ): Promise<Relacionamiento> {
    const relacionamiento = await this.relacionamientoRepository
      .createQueryBuilder('r')
      .innerJoinAndSelect('r.contacto', 'co')
      .innerJoin('co.cliente', 'cl')
      .where('r.id = :id', { id })
      .andWhere('r.eliminado = false')
      .andWhere('cl.pais_id = :paisSesionId', { paisSesionId })
      .getOne();

    if (!relacionamiento) {
      throw new BusinessException(
        ErrorCode.RELACIONAMIENTO_NO_ENCONTRADO,
        'Relacionamiento no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    return relacionamiento;
  }

  private validateFechaReunion(
    resultado: ResultadoRelacionamiento,
    fechaReunion?: string,
  ): void {
    const requiereReunion =
      resultado === ResultadoRelacionamiento.REUNION_PROGRAMADA;

    if (requiereReunion && !fechaReunion) {
      throw new BusinessException(
        ErrorCode.RELACIONAMIENTO_FECHA_REUNION_INVALIDA,
        'Debe indicar fecha de reunión cuando el resultado es Reunión programada',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!requiereReunion && fechaReunion) {
      throw new BusinessException(
        ErrorCode.RELACIONAMIENTO_FECHA_REUNION_INVALIDA,
        'La fecha de reunión solo aplica cuando el resultado es Reunión programada',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private toResponse(
    relacionamiento: Relacionamiento,
  ): RelacionamientoResponseDto {
    return {
      id: relacionamiento.id,
      contactoId: relacionamiento.contactoId,
      emisorUsuarioId: relacionamiento.emisorUsuarioId,
      canal: relacionamiento.canal,
      mensaje: relacionamiento.mensaje,
      fechaMensaje: relacionamiento.fechaMensaje,
      respuesta: relacionamiento.respuesta,
      fechaRespuesta: relacionamiento.fechaRespuesta,
      resultado: relacionamiento.resultado,
      fechaReunion: relacionamiento.fechaReunion,
    };
  }
}
