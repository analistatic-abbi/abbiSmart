import { forwardRef, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuditAccion,
  AuditEntidadTipo,
} from '../../common/enums/audit-accion.enum';
import { EstadoProceso } from '../../common/enums/estado-proceso.enum';
import { EstadoProyeccion } from '../../common/enums/estado-proyeccion.enum';
import { TipoProceso } from '../../common/enums/tipo-proceso.enum';
import { calcularEstadoSugerido } from '../../common/utils/proyeccion-calculos.util';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { Proyeccion } from '../../database/entities/proyeccion.entity';
import { Proceso } from '../../database/entities/proceso.entity';
import { AuditService } from '../audit/audit.service';
import { ProcesosService } from '../procesos/procesos.service';
import {
  CreateProyeccionDto,
  ProyeccionResponseDto,
  ProyeccionesQueryDto,
  UpdateProyeccionDto,
  VincularProcesoResultanteDto,
} from './dto/proyeccion.dto';

export interface ProyeccionesPage {
  data: ProyeccionResponseDto[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ProyeccionesService {
  constructor(
    @InjectRepository(Proyeccion)
    private readonly proyeccionRepository: Repository<Proyeccion>,
    @InjectRepository(Proceso)
    private readonly procesoRepository: Repository<Proceso>,
    @Inject(forwardRef(() => ProcesosService))
    private readonly procesosService: ProcesosService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(
    query: ProyeccionesQueryDto,
    paisSesionId: number,
  ): Promise<ProyeccionesPage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.proyeccionRepository
      .createQueryBuilder('py')
      .leftJoin('py.procesoOrigen', 'po')
      .leftJoin('py.procesoResultante', 'pr')
      .where('py.eliminado = false')
      .andWhere(
        '(po.pais_id = :paisSesionId OR pr.pais_id = :paisSesionId OR (py.proceso_origen_id IS NULL AND py.proceso_resultante_id IS NULL))',
        { paisSesionId },
      );

    if (query.estado) {
      qb.andWhere('py.estado = :estado', { estado: query.estado });
    }

    if (query.anioProyectado) {
      qb.andWhere('py.anio_proyectado = :anio', {
        anio: query.anioProyectado,
      });
    }

    qb.orderBy('py.fecha_estimada_publicacion', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [proyecciones, total] = await qb.getManyAndCount();

    return {
      data: await Promise.all(
        proyecciones.map((item) => this.toResponseWithVista(item.id)),
      ),
      total,
      page,
      limit,
    };
  }

  async findById(id: number, paisSesionId: number): Promise<ProyeccionResponseDto> {
    await this.getProyeccionActivaOrFail(id, paisSesionId);
    return this.toResponseWithVista(id);
  }

  async create(
    dto: CreateProyeccionDto,
    actorId: number,
    paisSesionId: number,
  ): Promise<ProyeccionResponseDto> {
    if (dto.procesoOrigenId) {
      const proceso = await this.procesosService.getProcesoActivoOrFail(
        dto.procesoOrigenId,
        paisSesionId,
      );

      const existente = await this.proyeccionRepository.findOne({
        where: { procesoOrigenId: proceso.id, eliminado: false },
      });

      if (existente) {
        throw new BusinessException(
          ErrorCode.PROYECCION_ORIGEN_DUPLICADA,
          'El proceso origen ya tiene una proyección asociada',
          HttpStatus.CONFLICT,
        );
      }
    }

    const estado = calcularEstadoSugerido(dto.fechaEstimadaPublicacion);

    const proyeccion = this.proyeccionRepository.create({
      procesoOrigenId: dto.procesoOrigenId ?? null,
      anioProyectado: dto.anioProyectado,
      fechaEstimadaPublicacion: dto.fechaEstimadaPublicacion,
      valorVenta: dto.valorVenta.toString(),
      valorFacturacion: dto.valorFacturacion.toString(),
      estado,
      mercado: dto.mercado ?? null,
      eliminado: false,
    });

    const saved = await this.proyeccionRepository.save(proyeccion);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.PROYECCION_CREAR,
      entidadTipo: AuditEntidadTipo.PROYECCION,
      entidadId: saved.id,
      valorNuevo: JSON.stringify(await this.toResponseWithVista(saved.id)),
    });

    return this.toResponseWithVista(saved.id);
  }

  async update(
    id: number,
    dto: UpdateProyeccionDto,
    actorId: number,
    paisSesionId: number,
  ): Promise<ProyeccionResponseDto> {
    const proyeccion = await this.getProyeccionActivaOrFail(id, paisSesionId);
    const valorAnterior = JSON.stringify(await this.toResponseWithVista(id));

    if (dto.anioProyectado !== undefined) {
      proyeccion.anioProyectado = dto.anioProyectado;
    }

    if (dto.fechaEstimadaPublicacion !== undefined) {
      proyeccion.fechaEstimadaPublicacion = dto.fechaEstimadaPublicacion;
    }

    if (dto.valorVenta !== undefined) {
      proyeccion.valorVenta = dto.valorVenta.toString();
    }

    if (dto.valorFacturacion !== undefined) {
      proyeccion.valorFacturacion = dto.valorFacturacion.toString();
    }

    if (dto.mercado !== undefined) {
      proyeccion.mercado = dto.mercado;
    }

    if (dto.estado !== undefined) {
      proyeccion.estado = dto.estado;
    } else if (dto.fechaEstimadaPublicacion !== undefined) {
      proyeccion.estado = calcularEstadoSugerido(
        proyeccion.fechaEstimadaPublicacion,
        proyeccion.estado,
      );
    }

    const saved = await this.proyeccionRepository.save(proyeccion);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.PROYECCION_EDITAR,
      entidadTipo: AuditEntidadTipo.PROYECCION,
      entidadId: saved.id,
      valorAnterior,
      valorNuevo: JSON.stringify(await this.toResponseWithVista(saved.id)),
    });

    return this.toResponseWithVista(saved.id);
  }

  async vincularProcesoResultante(
    id: number,
    dto: VincularProcesoResultanteDto,
    actorId: number,
    paisSesionId: number,
  ): Promise<ProyeccionResponseDto> {
    const proyeccion = await this.getProyeccionActivaOrFail(id, paisSesionId);

    await this.procesosService.getProcesoActivoOrFail(
      dto.procesoResultanteId,
      paisSesionId,
    );

    const duplicado = await this.proyeccionRepository.findOne({
      where: {
        procesoResultanteId: dto.procesoResultanteId,
        eliminado: false,
      },
    });

    if (duplicado && Number(duplicado.id) !== Number(id)) {
      throw new BusinessException(
        ErrorCode.PROYECCION_RESULTANTE_DUPLICADA,
        'El proceso resultante ya está vinculado a otra proyección',
        HttpStatus.CONFLICT,
      );
    }

    proyeccion.procesoResultanteId = dto.procesoResultanteId;
    proyeccion.estado = EstadoProyeccion.PUBLICADO;
    await this.proyeccionRepository.save(proyeccion);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.PROYECCION_VINCULAR_PROCESO,
      entidadTipo: AuditEntidadTipo.PROYECCION,
      entidadId: proyeccion.id,
      valorNuevo: JSON.stringify({
        procesoResultanteId: dto.procesoResultanteId,
      }),
    });

    return this.toResponseWithVista(proyeccion.id);
  }

  async softDelete(
    id: number,
    actorId: number,
    paisSesionId: number,
  ): Promise<void> {
    const proyeccion = await this.getProyeccionActivaOrFail(id, paisSesionId);
    proyeccion.eliminado = true;
    proyeccion.fechaEliminacion = new Date();
    proyeccion.eliminadoPorId = actorId;
    await this.proyeccionRepository.save(proyeccion);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.PROYECCION_ELIMINAR,
      entidadTipo: AuditEntidadTipo.PROYECCION,
      entidadId: proyeccion.id,
    });
  }

  async generarDesdeProcesoAdjudicado(
    procesoId: number,
    actorId: number,
  ): Promise<ProyeccionResponseDto | null> {
    const proceso = await this.procesoRepository.findOne({
      where: { id: procesoId, eliminado: false },
    });

    if (
      !proceso ||
      proceso.estado !== EstadoProceso.ADJUDICADO ||
      proceso.tipoProceso !== TipoProceso.PERIODICO
    ) {
      return null;
    }

    const existente = await this.proyeccionRepository.findOne({
      where: { procesoOrigenId: procesoId, eliminado: false },
    });

    if (existente) {
      return this.toResponseWithVista(existente.id);
    }

    const fechaBase = new Date(`${proceso.fechaCierre}T00:00:00`);
    fechaBase.setFullYear(fechaBase.getFullYear() + 1);
    const fechaEstimada = fechaBase.toISOString().slice(0, 10);
    const anioProyectado = fechaBase.getFullYear();

    const proyeccion = this.proyeccionRepository.create({
      procesoOrigenId: proceso.id,
      anioProyectado,
      fechaEstimadaPublicacion: fechaEstimada,
      valorVenta: proceso.cuantia,
      valorFacturacion: proceso.cuantia,
      estado: calcularEstadoSugerido(fechaEstimada),
      mercado: null,
      eliminado: false,
    });

    const saved = await this.proyeccionRepository.save(proyeccion);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.PROYECCION_GENERAR_AUTO,
      entidadTipo: AuditEntidadTipo.PROYECCION,
      entidadId: saved.id,
      valorNuevo: JSON.stringify({ procesoOrigenId: proceso.id }),
    });

    return this.toResponseWithVista(saved.id);
  }

  async actualizarEstadosAutomaticos(): Promise<number> {
    const rows = await this.proyeccionRepository.query(
      `SELECT id, estado, estado_sugerido AS estadoSugerido
       FROM vista_proyecciones_calculado
       WHERE estado NOT IN ('Publicado', 'Cerrado')
         AND estado <> estado_sugerido`,
    );

    let actualizadas = 0;

    for (const row of rows as Array<{ id: number; estadoSugerido: string }>) {
      await this.proyeccionRepository.update(row.id, {
        estado: row.estadoSugerido as EstadoProyeccion,
      });
      actualizadas += 1;
    }

    return actualizadas;
  }

  async getProyeccionActivaOrFail(
    id: number,
    paisSesionId: number,
  ): Promise<Proyeccion> {
    const proyeccion = await this.proyeccionRepository
      .createQueryBuilder('py')
      .leftJoinAndSelect('py.procesoOrigen', 'po')
      .leftJoinAndSelect('py.procesoResultante', 'pr')
      .where('py.id = :id', { id })
      .andWhere('py.eliminado = false')
      .andWhere(
        '(po.pais_id = :paisSesionId OR pr.pais_id = :paisSesionId OR (py.proceso_origen_id IS NULL AND py.proceso_resultante_id IS NULL))',
        { paisSesionId },
      )
      .getOne();

    if (!proyeccion) {
      throw new BusinessException(
        ErrorCode.PROYECCION_NO_ENCONTRADA,
        'Proyección no encontrada',
        HttpStatus.NOT_FOUND,
      );
    }

    return proyeccion;
  }

  private async toResponseWithVista(id: number): Promise<ProyeccionResponseDto> {
    const rows = await this.proyeccionRepository.query(
      `SELECT
         py.id,
         py.proceso_origen_id AS procesoOrigenId,
         py.proceso_resultante_id AS procesoResultanteId,
         py.anio_proyectado AS anioProyectado,
         py.fecha_estimada_publicacion AS fechaEstimadaPublicacion,
         py.valor_venta AS valorVenta,
         py.valor_facturacion AS valorFacturacion,
         py.estado,
         py.mercado,
         py.fecha_creacion AS fechaCreacion,
         v.dias_faltantes AS diasFaltantes,
         v.estado_sugerido AS estadoSugerido
       FROM proyecciones py
       INNER JOIN vista_proyecciones_calculado v ON v.id = py.id
       WHERE py.id = ?`,
      [id],
    );

    return rows[0] as ProyeccionResponseDto;
  }
}
