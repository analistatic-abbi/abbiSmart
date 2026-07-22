import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuditAccion,
  AuditEntidadTipo,
} from '../../common/enums/audit-accion.enum';
import { EstadoSolicitudEliminacion } from '../../common/enums/estado-solicitud-eliminacion.enum';
import { Rol } from '../../common/enums/rol.enum';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { SolicitudEliminacion } from '../../database/entities/solicitud-eliminacion.entity';
import { AuditService } from '../audit/audit.service';
import { ClientesService } from '../clientes/clientes.service';
import { ContactosService } from '../contactos/contactos.service';
import { ProcesosService } from '../procesos/procesos.service';
import { ProyeccionesService } from '../proyecciones/proyecciones.service';
import { RelacionamientosService } from '../relacionamientos/relacionamientos.service';
import {
  CreateSolicitudEliminacionDto,
  SolicitudEliminacionResponseDto,
} from './dto/solicitud-eliminacion.dto';

@Injectable()
export class SolicitudesEliminacionService {
  constructor(
    @InjectRepository(SolicitudEliminacion)
    private readonly solicitudRepository: Repository<SolicitudEliminacion>,
    private readonly procesosService: ProcesosService,
    private readonly clientesService: ClientesService,
    private readonly contactosService: ContactosService,
    private readonly relacionamientosService: RelacionamientosService,
    private readonly proyeccionesService: ProyeccionesService,
    private readonly auditService: AuditService,
  ) {}

  async findPendientes(): Promise<SolicitudEliminacionResponseDto[]> {
    const solicitudes = await this.solicitudRepository.find({
      where: { estado: EstadoSolicitudEliminacion.PENDIENTE },
      order: { fechaSolicitud: 'ASC' },
      take: 100,
    });

    return solicitudes.map((item) => this.toResponse(item));
  }

  async create(
    dto: CreateSolicitudEliminacionDto,
    actorId: number,
    paisSesionId: number,
    rol: Rol,
  ): Promise<SolicitudEliminacionResponseDto> {
    if (rol !== Rol.OPERADOR && rol !== Rol.SUPERVISOR_SISTEMA) {
      throw new BusinessException(
        ErrorCode.PERMISO_DENEGADO,
        'Solo Operador o Supervisor pueden solicitar eliminaciones',
        HttpStatus.FORBIDDEN,
      );
    }

    await this.assertEntidadExiste(
      dto.entidadTipo,
      dto.entidadId,
      paisSesionId,
    );

    const solicitud = this.solicitudRepository.create({
      entidadTipo: dto.entidadTipo,
      entidadId: dto.entidadId,
      usuarioSolicitanteId: actorId,
      motivo: dto.motivo,
      estado: EstadoSolicitudEliminacion.PENDIENTE,
    });

    const saved = await this.solicitudRepository.save(solicitud);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.SOLICITUD_ELIMINACION_CREAR,
      entidadTipo: AuditEntidadTipo.SOLICITUD_ELIMINACION,
      entidadId: saved.id,
      valorNuevo: JSON.stringify(this.toResponse(saved)),
    });

    return this.toResponse(saved);
  }

  async aprobar(
    id: number,
    actorId: number,
    paisSesionId: number,
    rol: Rol,
  ): Promise<SolicitudEliminacionResponseDto> {
    const solicitud = await this.resolverSolicitudBase(
      id,
      actorId,
      rol,
      EstadoSolicitudEliminacion.APROBADA,
    );

    await this.ejecutarEliminacion(
      solicitud.entidadTipo,
      solicitud.entidadId,
      actorId,
      paisSesionId,
      rol,
    );

    return this.toResponse(solicitud);
  }

  async rechazar(
    id: number,
    actorId: number,
    rol: Rol,
  ): Promise<SolicitudEliminacionResponseDto> {
    const solicitud = await this.resolverSolicitudBase(
      id,
      actorId,
      rol,
      EstadoSolicitudEliminacion.RECHAZADA,
    );

    return this.toResponse(solicitud);
  }

  private async resolverSolicitudBase(
    id: number,
    actorId: number,
    rol: Rol,
    estado: EstadoSolicitudEliminacion,
  ): Promise<SolicitudEliminacion> {
    if (rol !== Rol.ADMINISTRADOR) {
      throw new BusinessException(
        ErrorCode.PERMISO_DENEGADO,
        'Solo el Administrador puede resolver solicitudes de eliminación',
        HttpStatus.FORBIDDEN,
      );
    }

    const solicitud = await this.solicitudRepository.findOne({ where: { id } });

    if (!solicitud) {
      throw new BusinessException(
        ErrorCode.SOLICITUD_ELIMINACION_NO_ENCONTRADA,
        'Solicitud de eliminación no encontrada',
        HttpStatus.NOT_FOUND,
      );
    }

    if (solicitud.estado !== EstadoSolicitudEliminacion.PENDIENTE) {
      throw new BusinessException(
        ErrorCode.SOLICITUD_ELIMINACION_YA_RESUELTA,
        'La solicitud ya fue resuelta',
        HttpStatus.BAD_REQUEST,
      );
    }

    solicitud.estado = estado;
    solicitud.usuarioResuelveId = actorId;
    solicitud.fechaResolucion = new Date();

    const saved = await this.solicitudRepository.save(solicitud);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.SOLICITUD_ELIMINACION_RESOLVER,
      entidadTipo: AuditEntidadTipo.SOLICITUD_ELIMINACION,
      entidadId: saved.id,
      valorNuevo: JSON.stringify(this.toResponse(saved)),
    });

    return saved;
  }

  private async ejecutarEliminacion(
    entidadTipo: string,
    entidadId: number,
    actorId: number,
    paisSesionId: number,
    rol: Rol,
  ): Promise<void> {
    if (entidadTipo === 'proceso') {
      await this.procesosService.softDelete(
        entidadId,
        actorId,
        paisSesionId,
        rol,
        true,
      );
      return;
    }

    if (entidadTipo === 'cliente') {
      await this.clientesService.softDelete(
        entidadId,
        actorId,
        paisSesionId,
        rol,
        true,
      );
      return;
    }

    if (entidadTipo === 'contacto') {
      await this.contactosService.softDelete(
        entidadId,
        actorId,
        paisSesionId,
        rol,
      );
      return;
    }

    if (entidadTipo === 'relacionamiento') {
      await this.relacionamientosService.softDelete(
        entidadId,
        actorId,
        paisSesionId,
        rol,
      );
      return;
    }

    if (entidadTipo === 'proyeccion') {
      await this.proyeccionesService.softDelete(
        entidadId,
        actorId,
        paisSesionId,
        rol,
        true,
      );
      return;
    }

    throw new BusinessException(
      ErrorCode.VALIDATION_ERROR,
      `Tipo de entidad no soportado para eliminación: ${entidadTipo}`,
      HttpStatus.BAD_REQUEST,
    );
  }

  private async assertEntidadExiste(
    entidadTipo: string,
    entidadId: number,
    paisSesionId: number,
  ): Promise<void> {
    if (entidadTipo === 'proceso') {
      await this.procesosService.getProcesoActivoOrFail(entidadId, paisSesionId);
      return;
    }

    if (entidadTipo === 'cliente') {
      await this.clientesService.getClienteActivoOrFail(entidadId, paisSesionId);
      return;
    }

    if (entidadTipo === 'contacto') {
      await this.contactosService.findById(entidadId, paisSesionId);
      return;
    }

    if (entidadTipo === 'relacionamiento') {
      await this.relacionamientosService.findById(entidadId, paisSesionId);
      return;
    }

    if (entidadTipo === 'proyeccion') {
      await this.proyeccionesService.findById(entidadId, paisSesionId);
      return;
    }

    throw new BusinessException(
      ErrorCode.VALIDATION_ERROR,
      `Tipo de entidad no soportado: ${entidadTipo}`,
      HttpStatus.BAD_REQUEST,
    );
  }

  private toResponse(
    solicitud: SolicitudEliminacion,
  ): SolicitudEliminacionResponseDto {
    return {
      id: solicitud.id,
      entidadTipo: solicitud.entidadTipo,
      entidadId: solicitud.entidadId,
      usuarioSolicitanteId: solicitud.usuarioSolicitanteId,
      motivo: solicitud.motivo,
      estado: solicitud.estado,
      usuarioResuelveId: solicitud.usuarioResuelveId,
      fechaSolicitud: solicitud.fechaSolicitud,
      fechaResolucion: solicitud.fechaResolucion,
    };
  }
}
