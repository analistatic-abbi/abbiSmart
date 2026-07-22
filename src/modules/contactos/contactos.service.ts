import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuditAccion,
  AuditEntidadTipo,
} from '../../common/enums/audit-accion.enum';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { Contacto } from '../../database/entities/contacto.entity';
import { AuditService } from '../audit/audit.service';
import { ClientesService } from '../clientes/clientes.service';
import { ContactoResponseDto } from './dto/contacto-response.dto';
import { CreateContactoDto } from './dto/create-contacto.dto';
import { UpdateContactoDto } from './dto/update-contacto.dto';

@Injectable()
export class ContactosService {
  constructor(
    @InjectRepository(Contacto)
    private readonly contactoRepository: Repository<Contacto>,
    private readonly clientesService: ClientesService,
    private readonly auditService: AuditService,
  ) {}

  async findByCliente(
    clienteId: number,
    paisSesionId: number,
  ): Promise<ContactoResponseDto[]> {
    await this.clientesService.getClienteActivoOrFail(clienteId, paisSesionId);

    const contactos = await this.contactoRepository.find({
      where: { clienteId, eliminado: false },
      order: { esGenerico: 'DESC', nombre: 'ASC' },
    });

    return contactos.map((contacto) => this.toResponse(contacto));
  }

  async findById(id: number, paisSesionId: number): Promise<ContactoResponseDto> {
    const contacto = await this.getContactoActivoOrFail(id, paisSesionId);
    return this.toResponse(contacto);
  }

  async getContactoActivoOrFail(
    id: number,
    paisSesionId: number,
  ): Promise<Contacto> {
    const contacto = await this.contactoRepository.findOne({
      where: { id, eliminado: false },
      relations: { cliente: true },
    });

    if (!contacto || Number(contacto.cliente.paisId) !== Number(paisSesionId)) {
      throw new BusinessException(
        ErrorCode.CONTACTO_NO_ENCONTRADO,
        'Contacto no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    return contacto;
  }

  async create(
    clienteId: number,
    dto: CreateContactoDto,
    actorId: number,
    paisSesionId: number,
  ): Promise<ContactoResponseDto> {
    await this.clientesService.getClienteActivoOrFail(clienteId, paisSesionId);
    await this.clientesService.validateUbicacionInPais(
      dto.ubicacionId,
      paisSesionId,
    );

    if (dto.referidoPorContactoId) {
      await this.validateReferido(
        dto.referidoPorContactoId,
        clienteId,
        paisSesionId,
      );
    }

    const contacto = this.contactoRepository.create({
      clienteId,
      nombre: dto.nombre,
      ubicacionId: dto.ubicacionId,
      cargo: dto.cargo ?? null,
      telefono: dto.telefono ?? null,
      correo: dto.correo ?? null,
      referidoPorContactoId: dto.referidoPorContactoId ?? null,
      esGenerico: false,
      eliminado: false,
    });

    const saved = await this.contactoRepository.save(contacto);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.CONTACTO_CREAR,
      entidadTipo: AuditEntidadTipo.CONTACTO,
      entidadId: saved.id,
      valorNuevo: JSON.stringify(this.toResponse(saved)),
    });

    return this.toResponse(saved);
  }

  async update(
    id: number,
    dto: UpdateContactoDto,
    actorId: number,
    paisSesionId: number,
  ): Promise<ContactoResponseDto> {
    const contacto = await this.getContactoActivoOrFail(id, paisSesionId);

    if (contacto.esGenerico) {
      throw new BusinessException(
        ErrorCode.CONTACTO_GENERICO_NO_EDITABLE,
        'El contacto genérico no puede editarse',
        HttpStatus.BAD_REQUEST,
      );
    }

    const valorAnterior = JSON.stringify(this.toResponse(contacto));

    if (dto.ubicacionId !== undefined) {
      await this.clientesService.validateUbicacionInPais(
        dto.ubicacionId,
        paisSesionId,
      );
      contacto.ubicacionId = dto.ubicacionId;
    }

    if (dto.referidoPorContactoId !== undefined) {
      if (dto.referidoPorContactoId === contacto.id) {
        throw new BusinessException(
          ErrorCode.VALIDATION_ERROR,
          'Un contacto no puede referirse a sí mismo',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (dto.referidoPorContactoId) {
        await this.validateReferido(
          dto.referidoPorContactoId,
          contacto.clienteId,
          paisSesionId,
        );
      }

      contacto.referidoPorContactoId = dto.referidoPorContactoId;
    }

    if (dto.nombre !== undefined) contacto.nombre = dto.nombre;
    if (dto.cargo !== undefined) contacto.cargo = dto.cargo;
    if (dto.telefono !== undefined) contacto.telefono = dto.telefono;
    if (dto.correo !== undefined) contacto.correo = dto.correo;

    const saved = await this.contactoRepository.save(contacto);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.CONTACTO_EDITAR,
      entidadTipo: AuditEntidadTipo.CONTACTO,
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
    const contacto = await this.getContactoActivoOrFail(id, paisSesionId);

    if (contacto.esGenerico) {
      throw new BusinessException(
        ErrorCode.CONTACTO_GENERICO_NO_ELIMINABLE,
        'El contacto genérico no puede eliminarse',
        HttpStatus.BAD_REQUEST,
      );
    }

    contacto.eliminado = true;
    contacto.fechaEliminacion = new Date();
    contacto.eliminadoPorId = actorId;

    await this.contactoRepository.save(contacto);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.CONTACTO_ELIMINAR,
      entidadTipo: AuditEntidadTipo.CONTACTO,
      entidadId: contacto.id,
    });
  }

  private async validateReferido(
    referidoId: number,
    clienteId: number,
    paisSesionId: number,
  ): Promise<void> {
    const referido = await this.getContactoActivoOrFail(referidoId, paisSesionId);

    if (Number(referido.clienteId) !== Number(clienteId)) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        'El contacto referido debe pertenecer al mismo cliente',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  toResponse(contacto: Contacto): ContactoResponseDto {
    return {
      id: contacto.id,
      clienteId: contacto.clienteId,
      nombre: contacto.nombre,
      cargo: contacto.cargo,
      telefono: contacto.telefono,
      correo: contacto.correo,
      ubicacionId: contacto.ubicacionId,
      esGenerico: contacto.esGenerico,
      referidoPorContactoId: contacto.referidoPorContactoId,
      fechaCreacion: contacto.fechaCreacion,
    };
  }
}
