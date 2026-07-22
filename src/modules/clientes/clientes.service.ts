import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  AuditAccion,
  AuditEntidadTipo,
} from '../../common/enums/audit-accion.enum';
import { SegmentoCliente } from '../../common/enums/segmento-cliente.enum';
import { CONTACTO_GENERICO_NOMBRE } from '../../common/constants/crm.constants';
import { ClientesQueryDto } from '../../common/dto/pagination-query.dto';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { Cliente } from '../../database/entities/cliente.entity';
import { Contacto } from '../../database/entities/contacto.entity';
import { UbicacionGeografica } from '../../database/entities/ubicacion-geografica.entity';
import { AuditService } from '../audit/audit.service';
import { ClienteResponseDto } from './dto/cliente-response.dto';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

export interface ClientesPage {
  data: ClienteResponseDto[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private readonly clienteRepository: Repository<Cliente>,
    @InjectRepository(Contacto)
    private readonly contactoRepository: Repository<Contacto>,
    @InjectRepository(UbicacionGeografica)
    private readonly ubicacionRepository: Repository<UbicacionGeografica>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  async findAll(
    query: ClientesQueryDto,
    paisSesionId: number,
  ): Promise<ClientesPage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.clienteRepository
      .createQueryBuilder('c')
      .where('c.eliminado = false')
      .andWhere('c.pais_id = :paisSesionId', { paisSesionId });

    if (query.search) {
      qb.andWhere('c.empresa LIKE :search', {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy('c.empresa', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [clientes, total] = await qb.getManyAndCount();

    return {
      data: clientes.map((cliente) => this.toResponse(cliente)),
      total,
      page,
      limit,
    };
  }

  async findById(id: number, paisSesionId: number): Promise<ClienteResponseDto> {
    const cliente = await this.getClienteActivoOrFail(id, paisSesionId);
    return this.toResponse(cliente);
  }

  async getClienteActivoOrFail(
    id: number,
    paisSesionId: number,
  ): Promise<Cliente> {
    const cliente = await this.clienteRepository.findOne({
      where: { id, eliminado: false },
    });

    if (!cliente || Number(cliente.paisId) !== Number(paisSesionId)) {
      throw new BusinessException(
        ErrorCode.CLIENTE_NO_ENCONTRADO,
        'Cliente no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    return cliente;
  }

  async create(
    dto: CreateClienteDto,
    actorId: number,
    paisSesionId: number,
  ): Promise<ClienteResponseDto> {
    this.validateSegmentoOtro(dto.segmento, dto.segmentoOtro);
    await this.validateUbicacionInPais(dto.ubicacionId, paisSesionId);

    const saved = await this.dataSource.transaction(async (manager) => {
      const cliente = manager.create(Cliente, {
        empresa: dto.empresa,
        paisId: paisSesionId,
        ubicacionId: dto.ubicacionId,
        segmento: dto.segmento,
        segmentoOtro:
          dto.segmento === SegmentoCliente.OTRO ? dto.segmentoOtro ?? null : null,
        eliminado: false,
      });

      const clienteGuardado = await manager.save(cliente);

      const contactoGenerico = manager.create(Contacto, {
        clienteId: clienteGuardado.id,
        nombre: CONTACTO_GENERICO_NOMBRE,
        ubicacionId: clienteGuardado.ubicacionId,
        esGenerico: true,
        eliminado: false,
      });

      await manager.save(contactoGenerico);

      return clienteGuardado;
    });

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.CLIENTE_CREAR,
      entidadTipo: AuditEntidadTipo.CLIENTE,
      entidadId: saved.id,
      valorNuevo: JSON.stringify(this.toResponse(saved)),
    });

    return this.toResponse(saved);
  }

  async update(
    id: number,
    dto: UpdateClienteDto,
    actorId: number,
    paisSesionId: number,
  ): Promise<ClienteResponseDto> {
    const cliente = await this.getClienteActivoOrFail(id, paisSesionId);
    const valorAnterior = JSON.stringify(this.toResponse(cliente));

    const segmento = dto.segmento ?? cliente.segmento;
    const segmentoOtro =
      dto.segmentoOtro !== undefined
        ? dto.segmentoOtro
        : cliente.segmentoOtro;

    this.validateSegmentoOtro(segmento, segmentoOtro ?? undefined);

    if (dto.ubicacionId !== undefined) {
      await this.validateUbicacionInPais(dto.ubicacionId, paisSesionId);
      cliente.ubicacionId = dto.ubicacionId;
    }

    if (dto.empresa !== undefined) {
      cliente.empresa = dto.empresa;
    }

    cliente.segmento = segmento;
    cliente.segmentoOtro =
      segmento === SegmentoCliente.OTRO ? segmentoOtro : null;

    const saved = await this.clienteRepository.save(cliente);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.CLIENTE_EDITAR,
      entidadTipo: AuditEntidadTipo.CLIENTE,
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
    const cliente = await this.getClienteActivoOrFail(id, paisSesionId);
    const now = new Date();

    await this.dataSource.transaction(async (manager) => {
      cliente.eliminado = true;
      cliente.fechaEliminacion = now;
      cliente.eliminadoPorId = actorId;
      await manager.save(cliente);

      await manager.update(
        Contacto,
        { clienteId: cliente.id, eliminado: false },
        {
          eliminado: true,
          fechaEliminacion: now,
          eliminadoPorId: actorId,
        },
      );
    });

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.CLIENTE_ELIMINAR,
      entidadTipo: AuditEntidadTipo.CLIENTE,
      entidadId: cliente.id,
    });
  }

  async validateUbicacionInPais(
    ubicacionId: number,
    paisSesionId: number,
  ): Promise<UbicacionGeografica> {
    const ubicacion = await this.ubicacionRepository.findOne({
      where: { id: ubicacionId },
    });

    if (!ubicacion || Number(ubicacion.paisId) !== Number(paisSesionId)) {
      throw new BusinessException(
        ErrorCode.UBICACION_NO_ENCONTRADA,
        'Ubicación geográfica no válida para el país de sesión',
        HttpStatus.BAD_REQUEST,
      );
    }

    return ubicacion;
  }

  private validateSegmentoOtro(
    segmento: SegmentoCliente,
    segmentoOtro?: string,
  ): void {
    if (segmento === SegmentoCliente.OTRO && !segmentoOtro?.trim()) {
      throw new BusinessException(
        ErrorCode.SEGMENTO_OTRO_REQUERIDO,
        'Debe indicar el valor de segmento cuando selecciona Otro',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  toResponse(cliente: Cliente): ClienteResponseDto {
    return {
      id: cliente.id,
      empresa: cliente.empresa,
      paisId: cliente.paisId,
      ubicacionId: cliente.ubicacionId,
      segmento: cliente.segmento,
      segmentoOtro: cliente.segmentoOtro,
      fechaCreacion: cliente.fechaCreacion,
    };
  }
}
