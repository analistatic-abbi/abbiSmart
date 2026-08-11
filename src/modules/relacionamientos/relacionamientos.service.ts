import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  AuditAccion,
  AuditEntidadTipo,
} from '../../common/enums/audit-accion.enum';
import { ResultadoRelacionamiento } from '../../common/enums/resultado-relacionamiento.enum';
import { Rol } from '../../common/enums/rol.enum';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { Contacto } from '../../database/entities/contacto.entity';
import { Relacionamiento } from '../../database/entities/relacionamiento.entity';
import { AuditService } from '../audit/audit.service';
import { ContactosService } from '../contactos/contactos.service';
import {
  ContactoReferidoDto,
  CreateRelacionamientoDto,
} from './dto/create-relacionamiento.dto';
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

    if (
      query.fechaMensajeDesde &&
      query.fechaMensajeHasta &&
      query.fechaMensajeDesde > query.fechaMensajeHasta
    ) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        'La fecha desde no puede ser posterior a la fecha hasta',
        HttpStatus.BAD_REQUEST,
      );
    }

    const qb = this.relacionamientoRepository
      .createQueryBuilder('r')
      .innerJoin('r.contacto', 'co')
      .innerJoin('co.cliente', 'cl')
      .leftJoinAndSelect('r.contactoReferido', 'cref')
      .where('r.eliminado = false')
      .andWhere('cl.pais_id = :paisSesionId', { paisSesionId });

    if (query.contactoId) {
      qb.andWhere('r.contacto_id = :contactoId', {
        contactoId: query.contactoId,
      });
    }

    if (query.canal) {
      qb.andWhere('r.canal = :canal', { canal: query.canal });
    }

    if (query.resultado) {
      qb.andWhere('r.resultado = :resultado', { resultado: query.resultado });
    }

    if (query.search) {
      qb.andWhere(
        '(r.mensaje LIKE :search OR r.respuesta LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.fechaMensajeDesde) {
      qb.andWhere('r.fecha_mensaje >= :fechaMensajeDesde', {
        fechaMensajeDesde: query.fechaMensajeDesde,
      });
    }

    if (query.fechaMensajeHasta) {
      qb.andWhere('r.fecha_mensaje <= :fechaMensajeHasta', {
        fechaMensajeHasta: query.fechaMensajeHasta,
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
         r.fecha_alerta_respuesta AS fechaAlertaRespuesta,
         r.contacto_referido_id AS contactoReferidoId,
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
    const resultado = dto.resultado ?? ResultadoRelacionamiento.NINGUNO;

    this.validateFechaReunion(resultado, dto.fechaReunion);
    this.validateFechaAlertaRespuesta(dto.fechaMensaje, dto.fechaAlertaRespuesta);
    this.validateContactoReferido(resultado, dto.contactoReferido);

    const contactoOrigen = await this.contactosService.getContactoActivoOrFail(
      dto.contactoId,
      paisSesionId,
    );

    const saved = await this.relacionamientoRepository.manager.transaction(
      async (manager) => {
        let contactoReferidoId: number | null = null;

        if (
          resultado === ResultadoRelacionamiento.REFERIDO_TERCERO &&
          dto.contactoReferido
        ) {
          contactoReferidoId = await this.crearContactoReferido(
            contactoOrigen,
            dto.contactoReferido,
            actorId,
            paisSesionId,
            manager,
          );
        }

        const relacionamiento = manager.create(Relacionamiento, {
          contactoId: dto.contactoId,
          emisorUsuarioId: actorId,
          canal: dto.canal,
          mensaje: dto.mensaje,
          fechaMensaje: dto.fechaMensaje,
          fechaAlertaRespuesta: dto.fechaAlertaRespuesta,
          resultado,
          fechaReunion:
            resultado === ResultadoRelacionamiento.REUNION_PROGRAMADA
              ? dto.fechaReunion ?? null
              : null,
          contactoReferidoId,
          eliminado: false,
        });

        return manager.save(relacionamiento);
      },
    );

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.RELACIONAMIENTO_CREAR,
      entidadTipo: AuditEntidadTipo.RELACIONAMIENTO,
      entidadId: saved.id,
      valorNuevo: JSON.stringify(
        this.toResponse(await this.getActivoOrFail(saved.id, paisSesionId)),
      ),
    });

    return this.findById(saved.id, paisSesionId);
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

    if (
      resultado === ResultadoRelacionamiento.REFERIDO_TERCERO &&
      !relacionamiento.contactoReferidoId
    ) {
      this.validateContactoReferido(resultado, dto.contactoReferido);
    }

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

    if (
      resultado === ResultadoRelacionamiento.REFERIDO_TERCERO &&
      !relacionamiento.contactoReferidoId &&
      dto.contactoReferido
    ) {
      relacionamiento.contactoReferidoId = await this.crearContactoReferido(
        relacionamiento.contacto,
        dto.contactoReferido,
        actorId,
        paisSesionId,
      );
    }

    await this.relacionamientoRepository.save(relacionamiento);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.RELACIONAMIENTO_EDITAR,
      entidadTipo: AuditEntidadTipo.RELACIONAMIENTO,
      entidadId: relacionamiento.id,
      valorAnterior,
      valorNuevo: JSON.stringify(
        this.toResponse(await this.getActivoOrFail(id, paisSesionId)),
      ),
    });

    return this.findById(id, paisSesionId);
  }

  async softDelete(
    id: number,
    actorId: number,
    paisSesionId: number,
    rol: Rol,
  ): Promise<void> {
    if (rol !== Rol.ADMINISTRADOR) {
      throw new BusinessException(
        ErrorCode.PERMISO_DENEGADO,
        'Solo el Administrador puede eliminar relacionamientos directamente',
        HttpStatus.FORBIDDEN,
      );
    }

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
      .leftJoinAndSelect('r.contactoReferido', 'cref')
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

  private validateContactoReferido(
    resultado: ResultadoRelacionamiento,
    contactoReferido?: ContactoReferidoDto,
  ): void {
    if (resultado !== ResultadoRelacionamiento.REFERIDO_TERCERO) {
      return;
    }

    if (!contactoReferido?.nombre?.trim()) {
      throw new BusinessException(
        ErrorCode.RELACIONAMIENTO_REFERIDO_REQUERIDO,
        'Debe indicar los datos del contacto referido',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async crearContactoReferido(
    contactoOrigen: Contacto,
    contactoReferido: ContactoReferidoDto,
    actorId: number,
    paisSesionId: number,
    manager?: EntityManager,
  ): Promise<number> {
    const creado = await this.contactosService.createForCliente(
      contactoOrigen.clienteId,
      {
        nombre: contactoReferido.nombre.trim(),
        cargo: contactoReferido.cargo,
        telefono: contactoReferido.telefono,
        correo: contactoReferido.correo,
        ubicacionId:
          contactoReferido.ubicacionId ?? contactoOrigen.ubicacionId,
        referidoPorContactoId: contactoOrigen.id,
      },
      actorId,
      paisSesionId,
      manager,
    );

    return creado.id;
  }

  private validateFechaAlertaRespuesta(
    fechaMensaje: string,
    fechaAlertaRespuesta: string,
  ): void {
    if (fechaAlertaRespuesta < fechaMensaje) {
      throw new BusinessException(
        ErrorCode.RELACIONAMIENTO_FECHA_ALERTA_INVALIDA,
        'La fecha de alerta no puede ser anterior a la fecha del mensaje',
        HttpStatus.BAD_REQUEST,
      );
    }
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
      fechaAlertaRespuesta: relacionamiento.fechaAlertaRespuesta,
      respuesta: relacionamiento.respuesta,
      fechaRespuesta: relacionamiento.fechaRespuesta,
      resultado: relacionamiento.resultado,
      fechaReunion: relacionamiento.fechaReunion,
      contactoReferidoId: relacionamiento.contactoReferidoId,
      contactoReferidoNombre: relacionamiento.contactoReferido?.nombre ?? null,
    };
  }
}
