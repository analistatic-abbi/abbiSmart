import { forwardRef, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import {
  AuditAccion,
  AuditEntidadTipo,
} from '../../common/enums/audit-accion.enum';
import { CatalogoPaisTipo } from '../../common/enums/catalogo-pais-tipo.enum';
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
import { normalizarFechaDesdeBd } from '../../common/utils/proceso-fechas.util';
import {
  calcularMetricasMercado,
  metricasMercadoVacias,
} from '../../common/utils/efectividad-mercado.util';
import { calcularEstadoSugerido } from '../../common/utils/proyeccion-calculos.util';
import {
  resolveFiltroEliminados,
} from '../../common/utils/filtro-eliminados.util';
import { FiltroEliminados } from '../../common/enums/filtro-eliminados.enum';
import { detectarUmbralesTransicion } from '../../common/utils/proyeccion-transicion.util';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { Proyeccion } from '../../database/entities/proyeccion.entity';
import { Proceso } from '../../database/entities/proceso.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { AuditService } from '../audit/audit.service';
import { CatalogoPaisService } from '../catalogos/catalogo-pais.service';
import { ClientesService } from '../clientes/clientes.service';
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
import {
  EfectividadMercadoReporteDto,
  EfectividadMercadoRowRaw,
} from './dto/efectividad-mercado.dto';

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
    private readonly clientesService: ClientesService,
    private readonly notificacionesService: NotificacionesService,
    private readonly alertasControlService: AlertasControlService,
    private readonly permisosService: PermisosService,
    private readonly eliminacionDependenciasService: EliminacionDependenciasService,
    private readonly catalogoPaisService: CatalogoPaisService,
  ) {}

  async findAll(
    query: ProyeccionesQueryDto,
    paisSesionId: number,
    rol: Rol,
  ): Promise<ProyeccionesPage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filtroEliminados = resolveFiltroEliminados(
      query.filtroEliminados,
      query.incluirEliminados,
      rol,
      this.permisosService,
    );

    const conditions = ['v.pais_id = ?'];
    const params: unknown[] = [paisSesionId];

    if (filtroEliminados === FiltroEliminados.ACTIVOS) {
      conditions.push('py.eliminado = false');
    } else if (filtroEliminados === FiltroEliminados.SOLO_ELIMINADOS) {
      conditions.push('py.eliminado = true');
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
      conditions.push(
        '(v.empresa LIKE ? OR v.proceso_codigo LIKE ? OR v.objeto LIKE ?)',
      );
      const term = `%${query.search.trim()}%`;
      params.push(term, term, term);
    }

    if (query.procesoOrigenId) {
      conditions.push('py.proceso_origen_id = ?');
      params.push(query.procesoOrigenId);
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
    const esManual = !dto.procesoOrigenId;

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
    } else {
      this.validateEmpresaManual(dto.empresaClienteId, dto.empresaOtro);
      if (!dto.segmento) {
        throw new BusinessException(
          ErrorCode.PROCESO_EMPRESA_INVALIDA,
          'Debe indicar el segmento en proyecciones manuales',
          HttpStatus.BAD_REQUEST,
        );
      }
      await this.catalogoPaisService.assertCodigoActivo(
        paisSesionId,
        CatalogoPaisTipo.SEGMENTO_PROCESO,
        dto.segmento,
        'segmento',
      );
      if (dto.empresaClienteId) {
        await this.clientesService.getClienteActivoOrFail(
          dto.empresaClienteId,
          paisSesionId,
        );
      }
    }

    const estado = calcularEstadoSugerido(dto.fechaEstimadaPublicacion);

    const proyeccion = this.proyeccionRepository.create({
      procesoOrigenId: dto.procesoOrigenId ?? null,
      empresaClienteId: esManual ? dto.empresaClienteId ?? null : null,
      empresaOtro: esManual ? dto.empresaOtro?.trim() ?? null : null,
      segmento: esManual ? dto.segmento ?? null : null,
      objeto: dto.objeto?.trim() ?? null,
      paisId,
      anioProyectado: dto.anioProyectado,
      fechaEstimadaPublicacion: dto.fechaEstimadaPublicacion,
      valorVenta: dto.valorVenta.toString(),
      valorFacturacion: dto.valorFacturacion.toString(),
      estado,
      mercado: null,
      eliminado: false,
    });

    let saved: Proyeccion;
    try {
      saved = await this.proyeccionRepository.save(proyeccion);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        this.isDuplicateProcesoOrigenError(error)
      ) {
        throw new BusinessException(
          ErrorCode.PROYECCION_ORIGEN_DUPLICADA,
          'El proceso origen ya tiene una proyección asociada',
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }

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

    if (!proyeccion.procesoOrigenId) {
      if (dto.empresaClienteId !== undefined || dto.empresaOtro !== undefined) {
        const empresaClienteId =
          dto.empresaClienteId !== undefined
            ? dto.empresaClienteId
            : proyeccion.empresaClienteId;
        const empresaOtro =
          dto.empresaOtro !== undefined
            ? dto.empresaOtro
            : proyeccion.empresaOtro;
        this.validateEmpresaManual(empresaClienteId, empresaOtro ?? undefined);
        if (empresaClienteId) {
          await this.clientesService.getClienteActivoOrFail(
            empresaClienteId,
            paisSesionId,
          );
        }
        proyeccion.empresaClienteId = empresaClienteId ?? null;
        proyeccion.empresaOtro = empresaOtro?.trim() ?? null;
      }

      if (dto.segmento !== undefined && dto.segmento !== null) {
        await this.catalogoPaisService.assertCodigoActivo(
          paisSesionId,
          CatalogoPaisTipo.SEGMENTO_PROCESO,
          dto.segmento,
          'segmento',
        );
        proyeccion.segmento = dto.segmento;
      }

      if (dto.objeto !== undefined) {
        proyeccion.objeto = dto.objeto?.trim() ?? null;
      }
    } else if (dto.objeto !== undefined) {
      proyeccion.objeto = dto.objeto?.trim() ?? null;
    }

    if (dto.fechaEstimadaPublicacion !== undefined) {
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

  async getEfectividadMercado(
    anio: number,
    paisSesionId: number,
  ): Promise<EfectividadMercadoReporteDto> {
    const sinMercadoRows = await this.proyeccionRepository.query(
      `SELECT COUNT(*) AS total
       FROM proyecciones py
       WHERE py.eliminado = FALSE
         AND py.pais_id = ?
         AND py.anio_proyectado = ?
         AND py.mercado IS NULL`,
      [paisSesionId, anio],
    );

    const inconsistenciasRows = await this.proyeccionRepository.query(
      `SELECT COUNT(*) AS total
       FROM proyecciones py
       LEFT JOIN procesos pr
         ON pr.id = py.proceso_resultante_id
        AND pr.eliminado = FALSE
       WHERE py.eliminado = FALSE
         AND py.pais_id = ?
         AND py.anio_proyectado = ?
         AND py.mercado IN ('General', 'Objetivo')
         AND py.proceso_resultante_id IS NOT NULL
         AND pr.id IS NULL`,
      [paisSesionId, anio],
    );

    const rows = (await this.proyeccionRepository.query(
      `SELECT
         py.mercado AS mercado,
         COUNT(*) AS total,
         SUM(CASE
           WHEN py.proceso_resultante_id IS NOT NULL
            AND pr.id IS NOT NULL
            AND (COALESCE(pr.fue_adjudicado, 0) = 1 OR pr.estado = ?)
           THEN 1 ELSE 0 END) AS ganadas,
         SUM(CASE
           WHEN py.proceso_resultante_id IS NOT NULL
            AND pr.id IS NOT NULL
            AND NOT (COALESCE(pr.fue_adjudicado, 0) = 1 OR pr.estado = ?)
           THEN 1 ELSE 0 END) AS materializadasNoGanadas,
         SUM(CASE
           WHEN py.proceso_resultante_id IS NULL AND py.estado = ?
           THEN 1 ELSE 0 END) AS nuncaMaterializadas,
         SUM(CASE
           WHEN NOT (
             (py.proceso_resultante_id IS NOT NULL AND pr.id IS NOT NULL)
             OR (py.proceso_resultante_id IS NULL AND py.estado = ?)
           ) THEN 1 ELSE 0 END) AS pendientes
       FROM proyecciones py
       LEFT JOIN procesos pr
         ON pr.id = py.proceso_resultante_id
        AND pr.eliminado = FALSE
       WHERE py.eliminado = FALSE
         AND py.pais_id = ?
         AND py.anio_proyectado = ?
         AND py.mercado IN ('General', 'Objetivo')
       GROUP BY py.mercado`,
      [
        EstadoProceso.ADJUDICADO,
        EstadoProceso.ADJUDICADO,
        EstadoProyeccion.CERRADO,
        EstadoProyeccion.CERRADO,
        paisSesionId,
        anio,
      ],
    )) as Array<Record<string, unknown>>;

    const porMercado = new Map<MercadoProyeccion, EfectividadMercadoRowRaw>();

    for (const row of rows) {
      const mercado = String(row.mercado) as MercadoProyeccion;
      porMercado.set(mercado, {
        mercado,
        total: Number(row.total ?? 0),
        ganadas: Number(row.ganadas ?? 0),
        materializadasNoGanadas: Number(row.materializadasNoGanadas ?? 0),
        nuncaMaterializadas: Number(row.nuncaMaterializadas ?? 0),
        pendientes: Number(row.pendientes ?? 0),
      });
    }

    const generalRaw = porMercado.get(MercadoProyeccion.GENERAL);
    const objetivoRaw = porMercado.get(MercadoProyeccion.OBJETIVO);

    return {
      anio,
      sinMercado: Number(sinMercadoRows[0]?.total ?? 0),
      inconsistencias: Number(inconsistenciasRows[0]?.total ?? 0),
      general: generalRaw
        ? calcularMetricasMercado({
            nuncaMaterializadas: generalRaw.nuncaMaterializadas,
            materializadasNoGanadas: generalRaw.materializadasNoGanadas,
            ganadas: generalRaw.ganadas,
            pendientes: generalRaw.pendientes,
          })
        : metricasMercadoVacias(),
      objetivo: objetivoRaw
        ? calcularMetricasMercado({
            nuncaMaterializadas: objetivoRaw.nuncaMaterializadas,
            materializadasNoGanadas: objetivoRaw.materializadasNoGanadas,
            ganadas: objetivoRaw.ganadas,
            pendientes: objetivoRaw.pendientes,
          })
        : metricasMercadoVacias(),
    };
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

    const fechaFinalizacion = calcRows[0]?.fechaFinalizacion as
      | string
      | Date
      | undefined;

    if (!fechaFinalizacion) {
      throw new BusinessException(
        ErrorCode.PROYECCION_FECHA_BASE_INVALIDA,
        'No se pudo calcular la fecha de finalización del proceso para generar la proyección',
        HttpStatus.BAD_REQUEST,
      );
    }

    let fechaEstimada: string;
    let anioProyectado: number;

    try {
      ({ fecha: fechaEstimada, anio: anioProyectado } =
        normalizarFechaDesdeBd(fechaFinalizacion));
    } catch {
      throw new BusinessException(
        ErrorCode.PROYECCION_FECHA_BASE_INVALIDA,
        'La fecha de finalización del proceso no es válida para generar la proyección',
        HttpStatus.BAD_REQUEST,
      );
    }

    const proyeccion = this.proyeccionRepository.create({
      procesoOrigenId: proceso.id,
      empresaClienteId: proceso.empresaClienteId,
      empresaOtro: proceso.empresaOtro,
      segmento: proceso.segmento,
      objeto: proceso.objeto,
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

    const procesoLabel = proceso.codigo ?? `#${proceso.id}`;
    await this.notificarDestinatariosProyeccion(
      proceso.paisId,
      'proyeccion_creada_auto',
      `Se generó la proyección #${saved.id} a partir del proceso ${procesoLabel}`,
      saved.id,
    );

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
          const tipo =
            umbral === 'SaleEsteMes'
              ? 'proyeccion_sale_este_mes'
              : 'proyeccion_proxima';
          await this.notificacionesService.crear({
            usuarioId,
            tipo,
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

  async repararProyeccionesHuerfanas(actorId: number): Promise<{
    reparadas: number;
    omitidas: number;
  }> {
    const procesos = await this.procesoRepository.query(
      `SELECT p.id
       FROM procesos p
       LEFT JOIN proyecciones py
         ON py.proceso_origen_id = p.id AND py.eliminado = FALSE
       WHERE p.eliminado = FALSE
         AND p.estado = ?
         AND p.tipo_proceso = ?
         AND p.tipo_instrumento <> ?
         AND py.id IS NULL`,
      [EstadoProceso.ADJUDICADO, TipoProceso.PERIODICO, TipoInstrumento.RFI],
    );

    let reparadas = 0;
    let omitidas = 0;

    for (const row of procesos as Array<{ id: number }>) {
      const result = await this.generarDesdeProcesoAdjudicado(
        Number(row.id),
        actorId,
      );
      if (result) {
        reparadas += 1;
      } else {
        omitidas += 1;
      }
    }

    return { reparadas, omitidas };
  }

  private async notificarDestinatariosProyeccion(
    paisId: number,
    tipo: string,
    mensaje: string,
    proyeccionId: number,
  ): Promise<void> {
    const destinatarios = await this.resolverDestinatariosProyeccion(paisId);

    for (const usuarioId of destinatarios) {
      await this.notificacionesService.crear({
        usuarioId,
        tipo,
        mensaje,
        entidadTipo: 'proyeccion',
        entidadId: proyeccionId,
      });
    }
  }

  private isDuplicateProcesoOrigenError(error: QueryFailedError): boolean {
    const driverError = error.driverError as { code?: string; message?: string };
    return (
      driverError?.code === 'ER_DUP_ENTRY' &&
      (driverError.message?.includes('uk_proyeccion_origen') ?? false)
    );
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
         COALESCE(po.codigo, po.id_digitado) AS procesoOrigenCodigo,
         COALESCE(pr.codigo, pr.id_digitado) AS procesoResultanteCodigo,
         (
           SELECT py2.id
           FROM proyecciones py2
           WHERE py2.proceso_origen_id = v.proceso_resultante_id
             AND py2.eliminado = FALSE
           LIMIT 1
         ) AS proyeccionSiguienteId,
         v.empresa,
         v.segmento,
         v.objeto,
         v.anio_proyectado AS anioProyectado,
         v.fecha_estimada_publicacion AS fechaEstimadaPublicacion,
         v.valor_venta AS valorVenta,
         v.valor_facturacion AS valorFacturacion,
         v.estado,
         v.mercado,
         v.fecha_creacion AS fechaCreacion,
         v.dias_faltantes AS diasFaltantes,
         v.estado_sugerido AS estadoSugerido,
         py.empresa_cliente_id AS empresaClienteId,
         py.empresa_otro AS empresaOtro
       FROM vista_proyecciones_listado v
       INNER JOIN proyecciones py ON py.id = v.id
       LEFT JOIN procesos po ON po.id = v.proceso_origen_id
       LEFT JOIN procesos pr ON pr.id = v.proceso_resultante_id
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

  private formatFechaListado(row: Record<string, unknown>): string {
    const raw = row.fechaEstimadaPublicacion ?? row.fecha_estimada_publicacion;
    if (raw === undefined || raw === null) {
      return '';
    }

    if (typeof raw === 'string') {
      return raw.slice(0, 10);
    }

    try {
      return normalizarFechaDesdeBd(raw as Date).fecha;
    } catch {
      return String(raw);
    }
  }

  private mapListadoRow(row: Record<string, unknown>): ProyeccionResponseDto {
    const num = (camel: string, snake: string): number | null => {
      const raw = row[camel] ?? row[snake];
      return raw !== undefined && raw !== null ? Number(raw) : null;
    };
    const str = (camel: string, snake: string): string | null => {
      const raw = row[camel] ?? row[snake];
      return raw !== undefined && raw !== null ? String(raw) : null;
    };

    return {
      id: Number(row.id),
      paisId: Number(row.paisId ?? row.pais_id),
      procesoOrigenId: num('procesoOrigenId', 'proceso_origen_id'),
      procesoResultanteId: num('procesoResultanteId', 'proceso_resultante_id'),
      procesoCodigo: str('procesoCodigo', 'proceso_codigo'),
      procesoOrigenCodigo: str('procesoOrigenCodigo', 'proceso_origen_codigo'),
      procesoResultanteCodigo: str(
        'procesoResultanteCodigo',
        'proceso_resultante_codigo',
      ),
      proyeccionSiguienteId: num('proyeccionSiguienteId', 'proyeccion_siguiente_id'),
      empresa: str('empresa', 'empresa'),
      empresaClienteId: num('empresaClienteId', 'empresa_cliente_id'),
      empresaOtro: str('empresaOtro', 'empresa_otro'),
      segmento: str('segmento', 'segmento'),
      objeto: str('objeto', 'objeto'),
      anioProyectado: Number(row.anioProyectado ?? row.anio_proyectado),
      fechaEstimadaPublicacion: this.formatFechaListado(row),
      valorVenta: String(row.valorVenta ?? row.valor_venta),
      valorFacturacion: String(row.valorFacturacion ?? row.valor_facturacion),
      estado: (row.estado as EstadoProyeccion) ?? EstadoProyeccion.LEJANO,
      mercado: ((row.mercado as ProyeccionResponseDto['mercado']) ?? null) as ProyeccionResponseDto['mercado'],
      fechaCreacion: (row.fechaCreacion ?? row.fecha_creacion) as Date,
      diasFaltantes:
        row.diasFaltantes !== undefined && row.diasFaltantes !== null
          ? Number(row.diasFaltantes)
          : row.dias_faltantes !== undefined && row.dias_faltantes !== null
            ? Number(row.dias_faltantes)
            : undefined,
      estadoSugerido: (row.estadoSugerido ?? row.estado_sugerido) as
        | EstadoProyeccion
        | undefined,
    };
  }

  private validateEmpresaManual(
    empresaClienteId?: number | null,
    empresaOtro?: string,
  ): void {
    const tieneCliente =
      empresaClienteId !== undefined && empresaClienteId !== null;
    const tieneOtro = Boolean(empresaOtro?.trim());

    if (!tieneCliente && !tieneOtro) {
      throw new BusinessException(
        ErrorCode.PROCESO_EMPRESA_INVALIDA,
        'Debe indicar empresa (cliente registrado) o empresa_otro',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (tieneCliente && tieneOtro) {
      throw new BusinessException(
        ErrorCode.PROCESO_EMPRESA_INVALIDA,
        'Indique solo empresa (cliente registrado) o empresa_otro, no ambos',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
