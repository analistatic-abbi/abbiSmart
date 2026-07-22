import { forwardRef, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuditAccion,
  AuditEntidadTipo,
} from '../../common/enums/audit-accion.enum';
import { EstadoProceso } from '../../common/enums/estado-proceso.enum';
import { EstadoProyeccion } from '../../common/enums/estado-proyeccion.enum';
import { EstadoUsuario } from '../../common/enums/estado-usuario.enum';
import { MercadoProyeccion } from '../../common/enums/mercado-proyeccion.enum';
import { Rol } from '../../common/enums/rol.enum';
import { TipoProceso } from '../../common/enums/tipo-proceso.enum';
import { TipoInstrumento } from '../../common/enums/tipo-instrumento.enum';
import { AlertasControlService } from '../../common/services/alertas-control.service';
import { EliminacionDependenciasService } from '../../common/services/eliminacion-dependencias.service';
import { PermisosService } from '../../common/services/permisos.service';
import { calcularEstadoSugerido } from '../../common/utils/proyeccion-calculos.util';
import { detectarUmbralesTransicion } from '../../common/utils/proyeccion-transicion.util';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { Proyeccion } from '../../database/entities/proyeccion.entity';
import { Proceso } from '../../database/entities/proceso.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { AuditService } from '../audit/audit.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { ProcesosService } from '../procesos/procesos.service';
import {
  AsignarMercadoBatchDto,
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
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @Inject(forwardRef(() => ProcesosService))
    private readonly procesosService: ProcesosService,
    private readonly auditService: AuditService,
    private readonly notificacionesService: NotificacionesService,
    private readonly alertasControlService: AlertasControlService,
    private readonly permisosService: PermisosService,
    private readonly eliminacionDependenciasService: EliminacionDependenciasService,
  ) {}

  async findAll(
    query: ProyeccionesQueryDto,
    paisSesionId: number,
    rol: Rol,
  ): Promise<ProyeccionesPage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const incluirEliminados =
      query.incluirEliminados === true &&
      this.permisosService.puedeVerEliminados(rol);

    const conditions = ['v.pais_id = ?'];
    const params: unknown[] = [paisSesionId];

    if (!incluirEliminados) {
      conditions.push('py.eliminado = false');
    }

    if (query.estado) {
      conditions.push('py.estado = ?');
      params.push(query.estado);
    }

    if (query.anioProyectado) {
      conditions.push('py.anio_proyectado = ?');
      params.push(query.anioProyectado);
    }

    if (query.mercado) {
      conditions.push('py.mercado = ?');
      params.push(query.mercado);
    }

    if (query.search?.trim()) {
      conditions.push('(v.empresa LIKE ? OR v.proceso_codigo LIKE ?)');
      const term = `%${query.search.trim()}%`;
      params.push(term, term);
    }

    const whereClause = conditions.join(' AND ');

    const countRows = await this.proyeccionRepository.query(
      `SELECT COUNT(*) AS total
       FROM vista_proyecciones_listado v
       INNER JOIN proyecciones py ON py.id = v.id
       WHERE ${whereClause}`,
      params,
    );

    const rows = await this.proyeccionRepository.query(
      `SELECT v.*
       FROM vista_proyecciones_listado v
       INNER JOIN proyecciones py ON py.id = v.id
       WHERE ${whereClause}
       ORDER BY v.fecha_estimada_publicacion ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit],
    );

    return {
      data: rows.map((row: Record<string, unknown>) => this.mapListadoRow(row)),
      total: Number(countRows[0]?.total ?? 0),
      page,
      limit,
    };
  }

  async findById(
    id: number,
    paisSesionId: number,
    incluirEliminados = false,
  ): Promise<ProyeccionResponseDto> {
    await this.getProyeccionActivaOrFail(id, paisSesionId, incluirEliminados);
    return this.toResponseWithVista(id);
  }

  async create(
    dto: CreateProyeccionDto,
    actorId: number,
    paisSesionId: number,
  ): Promise<ProyeccionResponseDto> {
    let paisId = paisSesionId;

    if (dto.procesoOrigenId) {
      const proceso = await this.procesosService.getProcesoActivoOrFail(
        dto.procesoOrigenId,
        paisSesionId,
      );
      paisId = proceso.paisId;

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
      paisId,
      anioProyectado: dto.anioProyectado,
      fechaEstimadaPublicacion: dto.fechaEstimadaPublicacion,
      valorVenta: dto.valorVenta.toString(),
      valorFacturacion: dto.valorFacturacion.toString(),
      estado,
      mercado: null,
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

  async setMercadoEnCargaMasiva(
    proyeccionId: number,
    mercado: MercadoProyeccion,
  ): Promise<void> {
    await this.proyeccionRepository.update({ id: proyeccionId }, { mercado });
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

  async cerrar(
    id: number,
    actorId: number,
    paisSesionId: number,
    rol: Rol,
  ): Promise<ProyeccionResponseDto> {
    if (!this.permisosService.puedeCerrarProyeccion(rol)) {
      throw new BusinessException(
        ErrorCode.PERMISO_DENEGADO,
        'Solo Administrador o Supervisor del Sistema pueden cerrar proyecciones',
        HttpStatus.FORBIDDEN,
      );
    }

    const proyeccion = await this.getProyeccionActivaOrFail(id, paisSesionId);

    if (
      proyeccion.estado === EstadoProyeccion.PUBLICADO ||
      proyeccion.estado === EstadoProyeccion.CERRADO
    ) {
      throw new BusinessException(
        ErrorCode.PROYECCION_ESTADO_INVALIDO,
        'No se puede cerrar una proyección Publicada o ya Cerrada',
        HttpStatus.BAD_REQUEST,
      );
    }

    const valorAnterior = JSON.stringify(await this.toResponseWithVista(id));
    proyeccion.estado = EstadoProyeccion.CERRADO;
    await this.proyeccionRepository.save(proyeccion);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.PROYECCION_CERRAR,
      entidadTipo: AuditEntidadTipo.PROYECCION,
      entidadId: proyeccion.id,
      valorAnterior,
      valorNuevo: JSON.stringify(await this.toResponseWithVista(proyeccion.id)),
    });

    return this.toResponseWithVista(proyeccion.id);
  }

  async asignarMercadoBatch(
    dto: AsignarMercadoBatchDto,
    actorId: number,
    paisSesionId: number,
    rol: Rol,
  ): Promise<{ actualizadas: number }> {
    if (!this.permisosService.puedeAsignarMercado(rol)) {
      throw new BusinessException(
        ErrorCode.PERMISO_DENEGADO,
        'Solo Administrador o Supervisor del Sistema pueden asignar mercado',
        HttpStatus.FORBIDDEN,
      );
    }

    let actualizadas = 0;

    for (const item of dto.asignaciones) {
      const proyeccion = await this.getProyeccionActivaOrFail(
        item.proyeccionId,
        paisSesionId,
      );

      if (proyeccion.anioProyectado !== dto.anioProyectado) {
        throw new BusinessException(
          ErrorCode.PROYECCION_ANIO_NO_COINCIDE,
          `La proyección #${item.proyeccionId} no corresponde al año ${dto.anioProyectado}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      proyeccion.mercado = item.mercado;
      await this.proyeccionRepository.save(proyeccion);
      actualizadas += 1;
    }

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.PROYECCION_ASIGNAR_MERCADO,
      entidadTipo: AuditEntidadTipo.PROYECCION,
      entidadId: dto.asignaciones[0]?.proyeccionId ?? 0,
      valorNuevo: JSON.stringify(dto),
    });

    return { actualizadas };
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
    rol: Rol,
    confirmarDependientes = false,
  ): Promise<void> {
    if (rol !== Rol.ADMINISTRADOR) {
      throw new BusinessException(
        ErrorCode.PERMISO_DENEGADO,
        'Solo el Administrador puede eliminar proyecciones directamente',
        HttpStatus.FORBIDDEN,
      );
    }

    const proyeccion = await this.getProyeccionActivaOrFail(id, paisSesionId);
    const dependencias =
      await this.eliminacionDependenciasService.verificarProyeccion(
        proyeccion.id,
      );

    this.eliminacionDependenciasService.assertPuedeEliminar(
      dependencias,
      confirmarDependientes,
      this.permisosService.puedeEliminarDirecto(rol),
    );

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

  async getDependencias(id: number, paisSesionId: number) {
    await this.getProyeccionActivaOrFail(id, paisSesionId);
    return this.eliminacionDependenciasService.verificarProyeccion(id);
  }

  async resolveProcesoOrigenIdForCarga(
    referencia: string,
    paisSesionId: number,
  ): Promise<number> {
    const trimmed = referencia.trim();
    const numericId = Number.parseInt(trimmed, 10);

    if (!Number.isNaN(numericId)) {
      const procesoById = await this.procesoRepository.findOne({
        where: { id: numericId, paisId: paisSesionId, eliminado: false },
      });

      if (procesoById) {
        return procesoById.id;
      }
    }

    const proceso = await this.procesoRepository
      .createQueryBuilder('p')
      .where('p.pais_id = :paisSesionId', { paisSesionId })
      .andWhere('p.eliminado = false')
      .andWhere('(p.codigo = :ref OR p.id_digitado = :ref)', { ref: trimmed })
      .getOne();

    if (!proceso) {
      throw new BusinessException(
        ErrorCode.PROCESO_NO_ENCONTRADO,
        `Proceso origen no encontrado: ${trimmed}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return proceso.id;
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
      proceso.tipoProceso !== TipoProceso.PERIODICO ||
      proceso.tipoInstrumento === TipoInstrumento.RFI
    ) {
      return null;
    }

    const existente = await this.proyeccionRepository.findOne({
      where: { procesoOrigenId: procesoId, eliminado: false },
    });

    if (existente) {
      return this.toResponseWithVista(existente.id);
    }

    const calcRows = await this.procesoRepository.query(
      `SELECT fecha_finalizacion AS fechaFinalizacion
       FROM vista_procesos_calculado
       WHERE id = ?`,
      [procesoId],
    );

    const fechaFinalizacion = calcRows[0]?.fechaFinalizacion as string | undefined;

    if (!fechaFinalizacion) {
      throw new BusinessException(
        ErrorCode.PROYECCION_FECHA_BASE_INVALIDA,
        'No se pudo calcular la fecha de finalización del proceso para generar la proyección',
        HttpStatus.BAD_REQUEST,
      );
    }

    const fechaEstimada = fechaFinalizacion;
    const anioProyectado = new Date(`${fechaFinalizacion}T00:00:00`).getFullYear();

    const proyeccion = this.proyeccionRepository.create({
      procesoOrigenId: proceso.id,
      paisId: proceso.paisId,
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

  async actualizarEstadosYNotificar(): Promise<{
    estadosActualizados: number;
    notificacionesEnviadas: number;
  }> {
    const rows = await this.proyeccionRepository.query(
      `SELECT py.id, py.estado, py.pais_id AS paisId, v.estado_sugerido AS estadoSugerido
       FROM proyecciones py
       INNER JOIN vista_proyecciones_calculado v ON v.id = py.id
       WHERE py.eliminado = FALSE
         AND py.estado NOT IN ('Publicado', 'Cerrado')
         AND py.estado <> v.estado_sugerido`,
    );

    let estadosActualizados = 0;
    let notificacionesEnviadas = 0;

    for (const row of rows as Array<{
      id: number;
      estado: EstadoProyeccion;
      paisId: number;
      estadoSugerido: EstadoProyeccion;
    }>) {
      const umbrales = detectarUmbralesTransicion(row.estado, row.estadoSugerido);

      for (const umbral of umbrales) {
        const yaEnviada = await this.alertasControlService.yaEnviadaProyeccion(
          row.id,
          umbral,
        );

        if (yaEnviada) {
          continue;
        }

        const destinatarios = await this.resolverDestinatariosProyeccion(
          row.paisId,
        );

        for (const usuarioId of destinatarios) {
          await this.notificacionesService.crear({
            usuarioId,
            tipo: 'proyeccion_proxima',
            mensaje: `La proyección #${row.id} cambió a estado "${row.estadoSugerido}"`,
            entidadTipo: 'proyeccion',
            entidadId: row.id,
          });
          notificacionesEnviadas += 1;
        }

        await this.alertasControlService.registrarProyeccion(row.id, umbral);
      }

      await this.proyeccionRepository.update(row.id, {
        estado: row.estadoSugerido,
      });
      estadosActualizados += 1;
    }

    return { estadosActualizados, notificacionesEnviadas };
  }

  /** @deprecated Usar actualizarEstadosYNotificar */
  async actualizarEstadosAutomaticos(): Promise<number> {
    const result = await this.actualizarEstadosYNotificar();
    return result.estadosActualizados;
  }

  async resolverDestinatariosProyeccion(paisId: number): Promise<number[]> {
    const rows = await this.usuarioRepository.query(
      `SELECT id
       FROM usuarios
       WHERE eliminado = FALSE
         AND estado = ?
         AND (
           rol IN (?, ?, ?, ?)
           OR (rol = ? AND pais_id = ?)
         )`,
      [
        EstadoUsuario.ACTIVO,
        Rol.ADMINISTRADOR,
        Rol.SUPERVISOR_SISTEMA,
        Rol.VISITANTE,
        Rol.VALIDADOR,
        Rol.OPERADOR,
        paisId,
      ],
    );

    return rows.map((row: { id: number }) => Number(row.id));
  }

  async getProyeccionActivaOrFail(
    id: number,
    paisSesionId: number,
    incluirEliminados = false,
  ): Promise<Proyeccion> {
    const qb = this.proyeccionRepository
      .createQueryBuilder('py')
      .where('py.id = :id', { id })
      .andWhere('py.pais_id = :paisSesionId', { paisSesionId });

    if (!incluirEliminados) {
      qb.andWhere('py.eliminado = false');
    }

    const proyeccion = await qb.getOne();

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
         v.id,
         v.pais_id AS paisId,
         v.proceso_origen_id AS procesoOrigenId,
         v.proceso_resultante_id AS procesoResultanteId,
         v.proceso_codigo AS procesoCodigo,
         v.empresa,
         v.segmento,
         v.anio_proyectado AS anioProyectado,
         v.fecha_estimada_publicacion AS fechaEstimadaPublicacion,
         v.valor_venta AS valorVenta,
         v.valor_facturacion AS valorFacturacion,
         v.estado,
         v.mercado,
         v.fecha_creacion AS fechaCreacion,
         v.dias_faltantes AS diasFaltantes,
         v.estado_sugerido AS estadoSugerido
       FROM vista_proyecciones_listado v
       WHERE v.id = ?`,
      [id],
    );

    if (!rows[0]) {
      throw new BusinessException(
        ErrorCode.PROYECCION_NO_ENCONTRADA,
        'Proyección no encontrada',
        HttpStatus.NOT_FOUND,
      );
    }

    return this.mapListadoRow(rows[0]);
  }

  private mapListadoRow(row: Record<string, unknown>): ProyeccionResponseDto {
    return {
      id: Number(row.id),
      paisId: Number(row.paisId),
      procesoOrigenId: row.procesoOrigenId ? Number(row.procesoOrigenId) : null,
      procesoResultanteId: row.procesoResultanteId
        ? Number(row.procesoResultanteId)
        : null,
      procesoCodigo: (row.procesoCodigo as string) ?? null,
      empresa: (row.empresa as string) ?? null,
      segmento: (row.segmento as string) ?? null,
      anioProyectado: Number(row.anioProyectado),
      fechaEstimadaPublicacion: String(row.fechaEstimadaPublicacion),
      valorVenta: String(row.valorVenta),
      valorFacturacion: String(row.valorFacturacion),
      estado: row.estado as EstadoProyeccion,
      mercado: (row.mercado as ProyeccionResponseDto['mercado']) ?? null,
      fechaCreacion: row.fechaCreacion as Date,
      diasFaltantes:
        row.diasFaltantes !== undefined && row.diasFaltantes !== null
          ? Number(row.diasFaltantes)
          : undefined,
      estadoSugerido: row.estadoSugerido as EstadoProyeccion | undefined,
    };
  }
}
