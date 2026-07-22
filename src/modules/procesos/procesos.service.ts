import { forwardRef, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  TAREAS_SEGUIMIENTO_ORDEN,
  tareaAplicaParaInstrumento,
} from '../../common/constants/proceso-tareas.constants';
import {
  AuditAccion,
  AuditEntidadTipo,
} from '../../common/enums/audit-accion.enum';
import { CumpleIndicador } from '../../common/enums/cumple-indicador.enum';
import { EstadoProceso } from '../../common/enums/estado-proceso.enum';
import { INDICADORES_FINANCIEROS } from '../../common/enums/indicador-codigo.enum';
import { ReglaCumplimiento } from '../../common/enums/regla-cumplimiento.enum';
import { Rol } from '../../common/enums/rol.enum';
import { TipoInstrumento } from '../../common/enums/tipo-instrumento.enum';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { PermisosService } from '../../common/services/permisos.service';
import { resolveMonedaPorPaisNombre } from '../../common/utils/moneda.util';
import { Pais } from '../../database/entities/pais.entity';
import { ProcesoIndicador } from '../../database/entities/proceso-indicador.entity';
import { ProcesoTarea } from '../../database/entities/proceso-tarea.entity';
import { Proceso } from '../../database/entities/proceso.entity';
import { AuditService } from '../audit/audit.service';
import { ClientesService } from '../clientes/clientes.service';
import { ParametrosService } from '../parametros/parametros.service';
import { ProyeccionesService } from '../proyecciones/proyecciones.service';
import {
  CambiarEstadoProcesoDto,
  CompletarTareaDto,
  CreateProcesoDto,
  ProcesoIndicadorInputDto,
  ProcesoIndicadorResponseDto,
  ProcesoResponseDto,
  ProcesosQueryDto,
  TareaResponseDto,
  UpdateProcesoDto,
  UpdateProcesoFechasDto,
} from './dto/proceso.dto';

export interface ProcesosPage {
  data: ProcesoResponseDto[];
  total: number;
  page: number;
  limit: number;
}

const TRANSICIONES_ESTADO: Record<EstadoProceso, EstadoProceso[]> = {
  [EstadoProceso.POR_VALIDAR]: [EstadoProceso.EN_PROCESO, EstadoProceso.DESCARTADO],
  [EstadoProceso.EN_PROCESO]: [EstadoProceso.EN_VALIDACION, EstadoProceso.DESCARTADO],
  [EstadoProceso.DESCARTADO]: [],
  [EstadoProceso.EN_VALIDACION]: [EstadoProceso.PRESENTADO, EstadoProceso.EN_PROCESO],
  [EstadoProceso.PRESENTADO]: [
    EstadoProceso.SUBSANACION,
    EstadoProceso.ADJUDICADO,
    EstadoProceso.CERRADO,
  ],
  [EstadoProceso.SUBSANACION]: [EstadoProceso.PRESENTADO, EstadoProceso.ADJUDICADO],
  [EstadoProceso.ADJUDICADO]: [EstadoProceso.CERRADO],
  [EstadoProceso.CERRADO]: [],
};

@Injectable()
export class ProcesosService {
  constructor(
    @InjectRepository(Proceso)
    private readonly procesoRepository: Repository<Proceso>,
    @InjectRepository(ProcesoIndicador)
    private readonly indicadorRepository: Repository<ProcesoIndicador>,
    @InjectRepository(ProcesoTarea)
    private readonly tareaRepository: Repository<ProcesoTarea>,
    @InjectRepository(Pais)
    private readonly paisRepository: Repository<Pais>,
    private readonly clientesService: ClientesService,
    private readonly parametrosService: ParametrosService,
    private readonly permisosService: PermisosService,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => ProyeccionesService))
    private readonly proyeccionesService: ProyeccionesService,
  ) {}

  async findAll(
    query: ProcesosQueryDto,
    paisSesionId: number,
  ): Promise<ProcesosPage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.procesoRepository
      .createQueryBuilder('p')
      .where('p.eliminado = false')
      .andWhere('p.pais_id = :paisSesionId', { paisSesionId });

    if (query.estado) {
      qb.andWhere('p.estado = :estado', { estado: query.estado });
    }

    if (query.search) {
      qb.andWhere(
        '(p.codigo LIKE :search OR p.id_digitado LIKE :search OR p.empresa_otro LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy('p.fecha_creacion', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [procesos, total] = await qb.getManyAndCount();

    return {
      data: procesos.map((proceso) => this.toResponse(proceso)),
      total,
      page,
      limit,
    };
  }

  async findById(id: number, paisSesionId: number): Promise<ProcesoResponseDto> {
    const proceso = await this.getProcesoActivoOrFail(id, paisSesionId, {
      indicadores: true,
    });

    return this.toResponse(proceso, proceso.indicadores);
  }

  async create(
    dto: CreateProcesoDto,
    actorId: number,
    paisSesionId: number,
  ): Promise<ProcesoResponseDto> {
    this.validateEmpresa(dto.empresaClienteId, dto.empresaOtro);
    this.validateExperiencia(dto.experiencia, dto.observacion);
    this.validateRfiFechas(dto.tipoInstrumento, dto.fechaAdquisicionDerecho);
    this.validateIndicadoresCompletos(dto.indicadores);

    const hayVacios = dto.indicadores.some(
      (item) => item.valorRequerido === undefined || item.valorRequerido === null,
    );

    if (hayVacios && !dto.confirmarIndicadoresVacios) {
      throw new BusinessException(
        ErrorCode.PROCESO_INDICADORES_VACIOS_SIN_CONFIRMACION,
        'Debe confirmar los indicadores vacíos antes de continuar',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (dto.empresaClienteId) {
      await this.clientesService.getClienteActivoOrFail(
        dto.empresaClienteId,
        paisSesionId,
      );
    }

    await this.clientesService.validateUbicacionInPais(
      dto.ubicacionId,
      paisSesionId,
    );

    const pais = await this.paisRepository.findOne({ where: { id: paisSesionId } });

    if (!pais) {
      throw new BusinessException(
        ErrorCode.PAIS_NO_ENCONTRADO,
        'País de sesión no encontrado',
        HttpStatus.BAD_REQUEST,
      );
    }

    const moneda = resolveMonedaPorPaisNombre(pais.nombre);
    const indicadoresProcesados = await this.procesarIndicadores(
      dto.indicadores,
      paisSesionId,
    );

    const saved = await this.dataSource.transaction(async (manager) => {
      const proceso = manager.create(Proceso, {
        idDigitado: dto.idDigitado,
        empresaClienteId: dto.empresaClienteId ?? null,
        empresaOtro: dto.empresaOtro ?? null,
        paisId: paisSesionId,
        ubicacionId: dto.ubicacionId,
        portalOrigen: dto.portalOrigen ?? null,
        link: dto.link ?? null,
        cuantia: dto.cuantia.toString(),
        moneda,
        segmento: dto.segmento,
        tipoProceso: dto.tipoProceso,
        tipoInstrumento: dto.tipoInstrumento,
        plazoEjecucionMeses: dto.plazoEjecucionMeses,
        experiencia: dto.experiencia,
        observacion: dto.experiencia ? dto.observacion ?? null : null,
        estado: EstadoProceso.POR_VALIDAR,
        usuarioCreadorId: actorId,
        fechaApertura: dto.fechaApertura,
        fechaCierre: dto.fechaCierre,
        fechaManifestacionInteres: dto.fechaManifestacionInteres ?? null,
        fechaAdquisicionDerecho:
          dto.tipoInstrumento === TipoInstrumento.RFI
            ? null
            : dto.fechaAdquisicionDerecho ?? null,
        fechaReunionAclaratoria: dto.fechaReunionAclaratoria ?? null,
        fechaVisitaTecnica: dto.fechaVisitaTecnica ?? null,
        fechaSolicitudesAclaracion: dto.fechaSolicitudesAclaracion ?? null,
        fechaRespuestaAclaracion: dto.fechaRespuestaAclaracion ?? null,
        fechaLimitacionMypymes: dto.fechaLimitacionMypymes ?? null,
        eliminado: false,
      });

      const procesoGuardado = await manager.save(proceso);

      await manager.query('CALL sp_generar_codigo_proceso(?)', [procesoGuardado.id]);

      for (const indicador of indicadoresProcesados) {
        await manager.save(
          manager.create(ProcesoIndicador, {
            procesoId: procesoGuardado.id,
            ...indicador,
          }),
        );
      }

      for (const tareaCodigo of TAREAS_SEGUIMIENTO_ORDEN) {
        await manager.save(
          manager.create(ProcesoTarea, {
            procesoId: procesoGuardado.id,
            tareaCodigo,
            aplica: tareaAplicaParaInstrumento(
              tareaCodigo,
              dto.tipoInstrumento,
            ),
            completada: false,
          }),
        );
      }

      return procesoGuardado;
    });

    const reloaded = await this.getProcesoActivoOrFail(saved.id, paisSesionId, {
      indicadores: true,
    });

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.PROCESO_CREAR,
      entidadTipo: AuditEntidadTipo.PROCESO,
      entidadId: reloaded.id,
      valorNuevo: JSON.stringify(this.toResponse(reloaded, reloaded.indicadores)),
    });

    return this.toResponse(reloaded, reloaded.indicadores);
  }

  async update(
    id: number,
    dto: UpdateProcesoDto,
    actorId: number,
    paisSesionId: number,
    rol: Rol,
  ): Promise<ProcesoResponseDto> {
    this.assertPuedeGestionar(rol);
    const proceso = await this.getProcesoActivoOrFail(id, paisSesionId);
    const valorAnterior = JSON.stringify(this.toResponse(proceso));

    if (dto.portalOrigen !== undefined) proceso.portalOrigen = dto.portalOrigen;
    if (dto.link !== undefined) proceso.link = dto.link;
    if (dto.cuantia !== undefined) proceso.cuantia = dto.cuantia.toString();

    if (dto.experiencia !== undefined) {
      proceso.experiencia = dto.experiencia;
      proceso.observacion = dto.experiencia ? dto.observacion ?? null : null;
      this.validateExperiencia(proceso.experiencia, proceso.observacion ?? undefined);
    } else if (dto.observacion !== undefined) {
      proceso.observacion = dto.observacion;
      this.validateExperiencia(proceso.experiencia, proceso.observacion ?? undefined);
    }

    const saved = await this.procesoRepository.save(proceso);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.PROCESO_EDITAR,
      entidadTipo: AuditEntidadTipo.PROCESO,
      entidadId: saved.id,
      valorAnterior,
      valorNuevo: JSON.stringify(this.toResponse(saved)),
    });

    return this.toResponse(saved);
  }

  async updateFechas(
    id: number,
    dto: UpdateProcesoFechasDto,
    actorId: number,
    paisSesionId: number,
    rol: Rol,
  ): Promise<ProcesoResponseDto> {
    if (rol !== Rol.ADMINISTRADOR && rol !== Rol.SUPERVISOR_SISTEMA) {
      throw new BusinessException(
        ErrorCode.PERMISO_DENEGADO,
        'Solo Administrador o Supervisor pueden editar fechas del proceso',
        HttpStatus.FORBIDDEN,
      );
    }

    const proceso = await this.getProcesoActivoOrFail(id, paisSesionId, {
      indicadores: true,
    });
    this.assertIndicadoresValidados(proceso.indicadores ?? []);

    const valorAnterior = JSON.stringify(this.toResponse(proceso, proceso.indicadores));

    if (dto.fechaApertura !== undefined) proceso.fechaApertura = dto.fechaApertura;
    if (dto.fechaCierre !== undefined) proceso.fechaCierre = dto.fechaCierre;
    if (dto.fechaManifestacionInteres !== undefined) {
      proceso.fechaManifestacionInteres = dto.fechaManifestacionInteres;
    }
    if (dto.fechaAdquisicionDerecho !== undefined) {
      this.validateRfiFechas(proceso.tipoInstrumento, dto.fechaAdquisicionDerecho);
      proceso.fechaAdquisicionDerecho = dto.fechaAdquisicionDerecho;
    }
    if (dto.fechaReunionAclaratoria !== undefined) {
      proceso.fechaReunionAclaratoria = dto.fechaReunionAclaratoria;
    }
    if (dto.fechaVisitaTecnica !== undefined) {
      proceso.fechaVisitaTecnica = dto.fechaVisitaTecnica;
    }
    if (dto.fechaSolicitudesAclaracion !== undefined) {
      proceso.fechaSolicitudesAclaracion = dto.fechaSolicitudesAclaracion;
    }
    if (dto.fechaRespuestaAclaracion !== undefined) {
      proceso.fechaRespuestaAclaracion = dto.fechaRespuestaAclaracion;
    }
    if (dto.fechaLimitacionMypymes !== undefined) {
      proceso.fechaLimitacionMypymes = dto.fechaLimitacionMypymes;
    }

    const saved = await this.procesoRepository.save(proceso);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.PROCESO_EDITAR,
      entidadTipo: AuditEntidadTipo.PROCESO,
      entidadId: saved.id,
      valorAnterior,
      valorNuevo: JSON.stringify(this.toResponse(saved, proceso.indicadores)),
    });

    return this.toResponse(saved, proceso.indicadores);
  }

  async cambiarEstado(
    id: number,
    dto: CambiarEstadoProcesoDto,
    actorId: number,
    paisSesionId: number,
    rol: Rol,
  ): Promise<ProcesoResponseDto> {
    this.assertPuedeGestionar(rol);
    const proceso = await this.getProcesoActivoOrFail(id, paisSesionId);
    const valorAnterior = JSON.stringify(this.toResponse(proceso));

    const permitidos = TRANSICIONES_ESTADO[proceso.estado] ?? [];

    if (!permitidos.includes(dto.estado)) {
      throw new BusinessException(
        ErrorCode.PROCESO_ESTADO_INVALIDO,
        `No se puede cambiar de ${proceso.estado} a ${dto.estado}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    proceso.estado = dto.estado;
    const saved = await this.procesoRepository.save(proceso);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.PROCESO_CAMBIAR_ESTADO,
      entidadTipo: AuditEntidadTipo.PROCESO,
      entidadId: saved.id,
      valorAnterior,
      valorNuevo: JSON.stringify(this.toResponse(saved)),
    });

    if (dto.estado === EstadoProceso.ADJUDICADO) {
      await this.proyeccionesService.generarDesdeProcesoAdjudicado(
        saved.id,
        actorId,
      );
    }

    return this.toResponse(saved);
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
        'Solo el Administrador puede eliminar procesos directamente',
        HttpStatus.FORBIDDEN,
      );
    }

    const proceso = await this.getProcesoActivoOrFail(id, paisSesionId);
    proceso.eliminado = true;
    proceso.fechaEliminacion = new Date();
    proceso.eliminadoPorId = actorId;
    await this.procesoRepository.save(proceso);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.PROCESO_ELIMINAR,
      entidadTipo: AuditEntidadTipo.PROCESO,
      entidadId: proceso.id,
    });
  }

  async findTareas(
    procesoId: number,
    paisSesionId: number,
  ): Promise<TareaResponseDto[]> {
    await this.getProcesoActivoOrFail(procesoId, paisSesionId);

    const tareas = await this.tareaRepository.find({
      where: { procesoId },
      order: { id: 'ASC' },
    });

    return tareas.map((tarea) => this.toTareaResponse(tarea));
  }

  async completarTarea(
    procesoId: number,
    tareaId: number,
    dto: CompletarTareaDto,
    actorId: number,
    paisSesionId: number,
    rol: Rol,
  ): Promise<TareaResponseDto> {
    this.assertPuedeGestionar(rol);
    await this.getProcesoActivoOrFail(procesoId, paisSesionId);

    const tarea = await this.tareaRepository.findOne({
      where: { id: tareaId, procesoId },
    });

    if (!tarea) {
      throw new BusinessException(
        ErrorCode.TAREA_NO_ENCONTRADA,
        'Tarea no encontrada',
        HttpStatus.NOT_FOUND,
      );
    }

    if (!tarea.aplica) {
      throw new BusinessException(
        ErrorCode.TAREA_NO_APLICA,
        'Esta tarea no aplica para el proceso',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!dto.evidencia?.trim()) {
      throw new BusinessException(
        ErrorCode.TAREA_EVIDENCIA_REQUERIDA,
        'La evidencia es obligatoria para completar la tarea',
        HttpStatus.BAD_REQUEST,
      );
    }

    tarea.evidencia = dto.evidencia.trim();
    tarea.completada = true;
    tarea.fechaCompletada = new Date();
    tarea.usuarioCompletoId = actorId;

    const saved = await this.tareaRepository.save(tarea);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.TAREA_COMPLETAR,
      entidadTipo: AuditEntidadTipo.PROCESO_TAREA,
      entidadId: saved.id,
      valorNuevo: JSON.stringify(this.toTareaResponse(saved)),
    });

    return this.toTareaResponse(saved);
  }

  async getAvancePorcentaje(procesoId: number): Promise<number> {
    const rows = await this.procesoRepository.query(
      `SELECT avance_porcentaje AS avance
       FROM vista_procesos_avance
       WHERE proceso_id = ?`,
      [procesoId],
    );

    return Number(rows[0]?.avance ?? 0);
  }

  async getProcesoActivoOrFail(
    id: number,
    paisSesionId: number,
    relations: { indicadores?: boolean } = {},
  ): Promise<Proceso> {
    const proceso = await this.procesoRepository.findOne({
      where: { id, eliminado: false },
      relations,
    });

    if (!proceso || Number(proceso.paisId) !== Number(paisSesionId)) {
      throw new BusinessException(
        ErrorCode.PROCESO_NO_ENCONTRADO,
        'Proceso no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    return proceso;
  }

  private assertPuedeGestionar(rol: Rol): void {
    if (!this.permisosService.puedeGestionarProcesos(rol)) {
      throw new BusinessException(
        ErrorCode.PERMISO_DENEGADO,
        'No tiene permisos para gestionar procesos',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private validateEmpresa(
    empresaClienteId?: number,
    empresaOtro?: string,
  ): void {
    const tieneCliente = empresaClienteId !== undefined && empresaClienteId !== null;
    const tieneOtro = Boolean(empresaOtro?.trim());

    if (tieneCliente === tieneOtro) {
      throw new BusinessException(
        ErrorCode.PROCESO_EMPRESA_INVALIDA,
        'Debe indicar empresa como cliente registrado o como texto libre, pero no ambos',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private validateExperiencia(experiencia: boolean, observacion?: string): void {
    if (experiencia && !observacion?.trim()) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        'La observación es obligatoria cuando se marca experiencia',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private validateRfiFechas(
    tipoInstrumento: TipoInstrumento,
    fechaAdquisicionDerecho?: string | null,
  ): void {
    if (
      tipoInstrumento === TipoInstrumento.RFI &&
      fechaAdquisicionDerecho
    ) {
      throw new BusinessException(
        ErrorCode.PROCESO_RFI_FECHA_INVALIDA,
        'Los procesos RFI no admiten fecha de adquisición del derecho a participar',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private validateIndicadoresCompletos(
    indicadores: ProcesoIndicadorInputDto[],
  ): void {
    const codigos = indicadores.map((item) => item.indicadorCodigo);
    const faltantes = INDICADORES_FINANCIEROS.filter(
      (codigo) => !codigos.includes(codigo),
    );

    if (faltantes.length > 0 || indicadores.length !== INDICADORES_FINANCIEROS.length) {
      throw new BusinessException(
        ErrorCode.PROCESO_INDICADORES_INCOMPLETOS,
        'Debe registrar los 8 indicadores financieros del proceso',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private assertIndicadoresValidados(indicadores: ProcesoIndicador[]): void {
    const incompletos = indicadores.filter(
      (item) =>
        item.valorRequerido !== null &&
        item.parametroFinancieroId === null,
    );

    if (incompletos.length > 0) {
      throw new BusinessException(
        ErrorCode.PROCESO_FECHAS_SIN_INDICADORES,
        'Debe validar los indicadores financieros antes de editar fechas',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async procesarIndicadores(
    indicadores: ProcesoIndicadorInputDto[],
    paisSesionId: number,
  ): Promise<
    Array<{
      indicadorCodigo: ProcesoIndicador['indicadorCodigo'];
      valorRequerido: string | null;
      parametroFinancieroId: number | null;
      cumple: CumpleIndicador | null;
    }>
  > {
    const result: Array<{
      indicadorCodigo: ProcesoIndicador['indicadorCodigo'];
      valorRequerido: string | null;
      parametroFinancieroId: number | null;
      cumple: CumpleIndicador | null;
    }> = [];

    for (const item of indicadores) {
      if (item.valorRequerido === undefined || item.valorRequerido === null) {
        result.push({
          indicadorCodigo: item.indicadorCodigo,
          valorRequerido: null,
          parametroFinancieroId: null,
          cumple: null,
        });
        continue;
      }

      const parametro = await this.parametrosService.findVigentePorIndicador(
        paisSesionId,
        item.indicadorCodigo,
      );

      if (!parametro) {
        throw new BusinessException(
          ErrorCode.PARAMETRO_NO_ENCONTRADO,
          `No hay parámetro vigente para el indicador ${item.indicadorCodigo}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const cumple = this.evaluarCumplimiento(
        item.valorRequerido,
        Number(parametro.valor),
        parametro.reglaCumplimiento,
      );

      result.push({
        indicadorCodigo: item.indicadorCodigo,
        valorRequerido: item.valorRequerido.toString(),
        parametroFinancieroId: parametro.id,
        cumple,
      });
    }

    return result;
  }

  private evaluarCumplimiento(
    valorRequerido: number,
    valorParametro: number,
    regla: ReglaCumplimiento,
  ): CumpleIndicador {
    const cumple =
      regla === ReglaCumplimiento.MAYOR_O_IGUAL
        ? valorRequerido >= valorParametro
        : valorRequerido <= valorParametro;

    return cumple ? CumpleIndicador.CUMPLE : CumpleIndicador.NO_CUMPLE;
  }

  toResponse(
    proceso: Proceso,
    indicadores?: ProcesoIndicador[],
  ): ProcesoResponseDto {
    return {
      id: proceso.id,
      idDigitado: proceso.idDigitado,
      codigo: proceso.codigo,
      empresaClienteId: proceso.empresaClienteId,
      empresaOtro: proceso.empresaOtro,
      paisId: proceso.paisId,
      ubicacionId: proceso.ubicacionId,
      portalOrigen: proceso.portalOrigen,
      link: proceso.link,
      cuantia: proceso.cuantia,
      moneda: proceso.moneda,
      segmento: proceso.segmento,
      tipoProceso: proceso.tipoProceso,
      tipoInstrumento: proceso.tipoInstrumento,
      plazoEjecucionMeses: proceso.plazoEjecucionMeses,
      experiencia: proceso.experiencia,
      observacion: proceso.observacion,
      estado: proceso.estado,
      usuarioCreadorId: proceso.usuarioCreadorId,
      fechaCreacion: proceso.fechaCreacion,
      fechaApertura: proceso.fechaApertura,
      fechaManifestacionInteres: proceso.fechaManifestacionInteres,
      fechaAdquisicionDerecho: proceso.fechaAdquisicionDerecho,
      fechaReunionAclaratoria: proceso.fechaReunionAclaratoria,
      fechaVisitaTecnica: proceso.fechaVisitaTecnica,
      fechaSolicitudesAclaracion: proceso.fechaSolicitudesAclaracion,
      fechaRespuestaAclaracion: proceso.fechaRespuestaAclaracion,
      fechaLimitacionMypymes: proceso.fechaLimitacionMypymes,
      fechaCierre: proceso.fechaCierre,
      fechaInicioEjecucion: proceso.fechaInicioEjecucion,
      fechaFinalizacion: proceso.fechaFinalizacion,
      indicadores: indicadores?.map((item) => this.toIndicadorResponse(item)),
    };
  }

  toIndicadorResponse(indicador: ProcesoIndicador): ProcesoIndicadorResponseDto {
    return {
      id: indicador.id,
      indicadorCodigo: indicador.indicadorCodigo,
      valorRequerido: indicador.valorRequerido,
      parametroFinancieroId: indicador.parametroFinancieroId,
      cumple: indicador.cumple,
    };
  }

  toTareaResponse(tarea: ProcesoTarea): TareaResponseDto {
    return {
      id: tarea.id,
      procesoId: tarea.procesoId,
      tareaCodigo: tarea.tareaCodigo,
      aplica: tarea.aplica,
      evidencia: tarea.evidencia,
      completada: tarea.completada,
      fechaCompletada: tarea.fechaCompletada,
      usuarioCompletoId: tarea.usuarioCompletoId,
    };
  }
}
