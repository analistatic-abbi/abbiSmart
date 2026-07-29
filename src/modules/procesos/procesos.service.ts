import { forwardRef, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  TAREAS_SEGUIMIENTO_ORDEN,
  tareaAplicaParaProceso,
} from '../../common/constants/proceso-tareas.constants';
import {
  AuditAccion,
  AuditEntidadTipo,
} from '../../common/enums/audit-accion.enum';
import { CumpleIndicador } from '../../common/enums/cumple-indicador.enum';
import { EstadoProceso } from '../../common/enums/estado-proceso.enum';
import { MotivoPerdidaProceso } from '../../common/enums/motivo-perdida-proceso.enum';
import { INDICADORES_FINANCIEROS } from '../../common/enums/indicador-codigo.enum';
import { ReglaCumplimiento } from '../../common/enums/regla-cumplimiento.enum';
import { Rol } from '../../common/enums/rol.enum';
import { TareaCodigo } from '../../common/enums/tarea-codigo.enum';
import { TipoInstrumento } from '../../common/enums/tipo-instrumento.enum';
import { buildSingleSheetBuffer } from '../../common/utils/spreadsheet-writer';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { PermisosService } from '../../common/services/permisos.service';
import { EliminacionDependenciasService } from '../../common/services/eliminacion-dependencias.service';
import { AlertasControlService } from '../../common/services/alertas-control.service';
import { resolveMonedaPorPaisNombre } from '../../common/utils/moneda.util';
import {
  validateFechasEnRango,
} from '../../common/utils/proceso-fechas.util';
import { Pais } from '../../database/entities/pais.entity';
import { ProcesoIndicador } from '../../database/entities/proceso-indicador.entity';
import { ProcesoTarea } from '../../database/entities/proceso-tarea.entity';
import { Proceso } from '../../database/entities/proceso.entity';
import { ProcesoComentario } from '../../database/entities/proceso-comentario.entity';
import { AuditService } from '../audit/audit.service';
import { ClientesService } from '../clientes/clientes.service';
import { ParametrosService } from '../parametros/parametros.service';
import { ProyeccionesService } from '../proyecciones/proyecciones.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { ProyeccionResponseDto } from '../proyecciones/dto/proyeccion.dto';
import {
  CambiarEstadoProcesoDto,
  CompletarTareaDto,
  CreateProcesoComentarioDto,
  CreateProcesoDto,
  ProcesoComentarioResponseDto,
  ProcesoIndicadorInputDto,
  ProcesoIndicadorResponseDto,
  ProcesoResponseDto,
  ProcesosQueryDto,
  RegistrarMotivoPerdidaDto,
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

export interface CambiarEstadoProcesoResult {
  proceso: ProcesoResponseDto;
  proyeccionGenerada: ProyeccionResponseDto | null;
}

const TRANSICIONES_ESTADO: Record<EstadoProceso, EstadoProceso[]> = {
  [EstadoProceso.POR_VALIDAR]: [EstadoProceso.EN_PROCESO, EstadoProceso.DESCARTADO],
  [EstadoProceso.EN_PROCESO]: [EstadoProceso.DESCARTADO],
  [EstadoProceso.DESCARTADO]: [],
  [EstadoProceso.EN_VALIDACION]: [],
  [EstadoProceso.PRESENTADO]: [
    EstadoProceso.SUBSANACION,
    EstadoProceso.ADJUDICADO,
    EstadoProceso.CERRADO,
  ],
  [EstadoProceso.SUBSANACION]: [EstadoProceso.PRESENTADO, EstadoProceso.ADJUDICADO],
  [EstadoProceso.ADJUDICADO]: [EstadoProceso.CERRADO],
  [EstadoProceso.CERRADO]: [],
};

function requiereMotivoPerdida(
  estadoAnterior: EstadoProceso,
  estadoNuevo: EstadoProceso,
): boolean {
  if (estadoNuevo === EstadoProceso.DESCARTADO) {
    return true;
  }
  if (
    estadoNuevo === EstadoProceso.CERRADO &&
    estadoAnterior !== EstadoProceso.ADJUDICADO
  ) {
    return true;
  }
  return false;
}

function procesoRequiereMotivoBackfill(proceso: Proceso): boolean {
  if (proceso.motivoPerdida) {
    return false;
  }
  if (proceso.estado === EstadoProceso.DESCARTADO) {
    return true;
  }
  if (proceso.estado === EstadoProceso.CERRADO && !proceso.fueAdjudicado) {
    return true;
  }
  return false;
}

@Injectable()
export class ProcesosService {
  constructor(
    @InjectRepository(Proceso)
    private readonly procesoRepository: Repository<Proceso>,
    @InjectRepository(ProcesoIndicador)
    private readonly indicadorRepository: Repository<ProcesoIndicador>,
    @InjectRepository(ProcesoTarea)
    private readonly tareaRepository: Repository<ProcesoTarea>,
    @InjectRepository(ProcesoComentario)
    private readonly comentarioRepository: Repository<ProcesoComentario>,
    @InjectRepository(Pais)
    private readonly paisRepository: Repository<Pais>,
    private readonly clientesService: ClientesService,
    private readonly parametrosService: ParametrosService,
    private readonly permisosService: PermisosService,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => ProyeccionesService))
    private readonly proyeccionesService: ProyeccionesService,
    private readonly eliminacionDependenciasService: EliminacionDependenciasService,
    private readonly alertasControlService: AlertasControlService,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  async findAll(
    query: ProcesosQueryDto,
    paisSesionId: number,
    rol: Rol,
  ): Promise<ProcesosPage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const incluirEliminados =
      query.incluirEliminados === true &&
      this.permisosService.puedeVerEliminados(rol);

    const qb = this.procesoRepository
      .createQueryBuilder('p')
      .where('p.pais_id = :paisSesionId', { paisSesionId });

    if (!incluirEliminados) {
      qb.andWhere('p.eliminado = false');
    }

    if (query.estado) {
      qb.andWhere('p.estado = :estado', { estado: query.estado });
    }

    if (query.segmento) {
      qb.andWhere('p.segmento = :segmento', { segmento: query.segmento });
    }

    if (query.tipoProceso) {
      qb.andWhere('p.tipo_proceso = :tipoProceso', {
        tipoProceso: query.tipoProceso,
      });
    }

    if (query.tipoInstrumento) {
      qb.andWhere('p.tipo_instrumento = :tipoInstrumento', {
        tipoInstrumento: query.tipoInstrumento,
      });
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
    const calculos = await this.loadCalculosProcesos(procesos.map((p) => p.id));

    return {
      data: procesos.map((proceso) =>
        this.toResponse(proceso, undefined, calculos.get(proceso.id)),
      ),
      total,
      page,
      limit,
    };
  }

  async exportarXlsx(
    query: ProcesosQueryDto,
    paisSesionId: number,
    rol: Rol,
  ): Promise<{ buffer: Buffer; filename: string; truncado: boolean }> {
    const exportQuery: ProcesosQueryDto = {
      ...query,
      page: 1,
      limit: 10_000,
    };
    const page = await this.findAll(exportQuery, paisSesionId, rol);
    const fecha = new Date().toISOString().slice(0, 10);
    const rows = page.data.map((proceso) => ({
      'ID digitado': proceso.idDigitado,
      Código: proceso.codigo,
      Empresa: proceso.empresaMostrar ?? proceso.empresaOtro,
      Estado: proceso.estado,
      Segmento: proceso.segmento,
      'Tipo proceso': proceso.tipoProceso,
      Instrumento: proceso.tipoInstrumento,
      Cuantía: proceso.cuantia,
      Moneda: proceso.moneda,
      'Fecha cierre': proceso.fechaCierre,
      'Días restantes': proceso.diasRestantesCierre,
      'Avance %': proceso.avancePorcentaje,
    }));

    return {
      buffer: buildSingleSheetBuffer('Procesos', rows),
      filename: `procesos-${fecha}.xlsx`,
      truncado: page.total > exportQuery.limit!,
    };
  }

  async findById(id: number, paisSesionId: number): Promise<ProcesoResponseDto> {
    const proceso = await this.getProcesoActivoOrFail(id, paisSesionId, {
      indicadores: true,
      motivoPerdidaUsuario: true,
    });

    return this.toResponse(
      proceso,
      proceso.indicadores,
      (await this.loadCalculosProcesos([proceso.id])).get(proceso.id),
    );
  }

  async getFechasHistorial(id: number, paisSesionId: number) {
    await this.getProcesoActivoOrFail(id, paisSesionId);

    const rows = await this.auditService.findByEntidad(
      AuditEntidadTipo.PROCESO,
      id,
      { accion: AuditAccion.PROCESO_FECHA_EDITAR, limit: 100 },
    );

    return rows.map((row) => ({
      id: row.id,
      campo: row.campo,
      valorAnterior: row.valorAnterior,
      valorNuevo: row.valorNuevo,
      usuarioId: row.usuarioId,
      fechaHora: row.fechaHora,
    }));
  }

  async findComentarios(
    procesoId: number,
    paisSesionId: number,
  ): Promise<ProcesoComentarioResponseDto[]> {
    await this.getProcesoActivoOrFail(procesoId, paisSesionId);

    const rows = await this.comentarioRepository.find({
      where: { procesoId },
      relations: { usuario: true },
      order: { fechaCreacion: 'ASC' },
    });

    return rows.map((row) => ({
      id: Number(row.id),
      procesoId: Number(row.procesoId),
      usuarioId: Number(row.usuarioId),
      usuarioNombre: row.usuario?.nombre ?? 'Usuario',
      texto: row.texto,
      fechaCreacion: row.fechaCreacion,
    }));
  }

  async crearComentario(
    procesoId: number,
    dto: CreateProcesoComentarioDto,
    usuarioId: number,
    paisSesionId: number,
  ): Promise<ProcesoComentarioResponseDto> {
    await this.getProcesoActivoOrFail(procesoId, paisSesionId);

    const texto = dto.texto.trim();
    if (!texto) {
      throw new BusinessException(
        ErrorCode.VALIDACION_COMENTARIO_REQUERIDO,
        'El comentario no puede estar vacío',
        HttpStatus.BAD_REQUEST,
      );
    }

    const saved = await this.comentarioRepository.save(
      this.comentarioRepository.create({
        procesoId,
        usuarioId,
        texto,
      }),
    );

    const withUsuario = await this.comentarioRepository.findOne({
      where: { id: saved.id },
      relations: { usuario: true },
    });

    return {
      id: Number(saved.id),
      procesoId: Number(saved.procesoId),
      usuarioId: Number(saved.usuarioId),
      usuarioNombre: withUsuario?.usuario?.nombre ?? 'Usuario',
      texto: saved.texto,
      fechaCreacion: saved.fechaCreacion,
    };
  }

  async notificarCierresProximos(): Promise<{ notificacionesEnviadas: number }> {
    const rows = await this.dataSource.query(
      `SELECT p.id,
              p.pais_id AS paisId,
              p.codigo,
              p.id_digitado AS idDigitado,
              COALESCE(c.empresa, p.empresa_otro) AS empresaMostrar,
              DATEDIFF(p.fecha_cierre, CURDATE()) AS diasRestantes
       FROM procesos p
       LEFT JOIN clientes c ON c.id = p.empresa_cliente_id
       WHERE p.eliminado = FALSE
         AND p.estado IN (?, ?)
         AND DATEDIFF(p.fecha_cierre, CURDATE()) BETWEEN 0 AND 5`,
      [EstadoProceso.POR_VALIDAR, EstadoProceso.EN_PROCESO],
    );

    let enviadas = 0;

    for (const row of rows as Array<{
      id: number;
      paisId: number;
      codigo: string | null;
      idDigitado: string;
      empresaMostrar: string | null;
      diasRestantes: number;
    }>) {
      const procesoId = Number(row.id);
      const dias = Number(row.diasRestantes);
      const procesoLabel = row.codigo ?? row.idDigitado ?? `ID ${procesoId}`;
      const empresa = row.empresaMostrar ?? 'Sin empresa';

      const umbrales: Array<{ umbral: string; tipo: string; textoUmbral: string }> = [];
      if (dias <= 5) {
        umbrales.push({
          umbral: 'cierre_5d',
          tipo: 'proceso_cierre_proximo',
          textoUmbral: '5 días o menos',
        });
      }
      if (dias <= 2) {
        umbrales.push({
          umbral: 'cierre_2d',
          tipo: 'proceso_cierre_urgente',
          textoUmbral: '2 días o menos',
        });
      }

      const destinatarios =
        await this.proyeccionesService.resolverDestinatariosProyeccion(
          Number(row.paisId),
        );

      for (const { umbral, tipo, textoUmbral } of umbrales) {
        const yaEnviada = await this.alertasControlService.yaEnviadaProceso(
          procesoId,
          umbral,
        );
        if (yaEnviada) {
          continue;
        }

        const mensaje = `El proceso ${procesoLabel} (${empresa}) cierra en ${dias} día(s) (${textoUmbral}). Requiere atención antes de validación.`;

        for (const usuarioId of destinatarios) {
          await this.notificacionesService.crear({
            usuarioId,
            tipo,
            mensaje,
            entidadTipo: 'proceso',
            entidadId: procesoId,
          });
          enviadas += 1;
        }

        await this.alertasControlService.registrarProceso(procesoId, umbral);
      }
    }

    return { notificacionesEnviadas: enviadas };
  }

  async create(
    dto: CreateProcesoDto,
    actorId: number,
    paisSesionId: number,
  ): Promise<ProcesoResponseDto> {
    this.validateEmpresa(dto.empresaClienteId, dto.empresaOtro);
    this.validateExperiencia(dto.experiencia, dto.observacion);
    this.validateIndicadoresCompletos(dto.indicadores);
    validateFechasEnRango({
      fechaApertura: dto.fechaApertura,
      fechaCierre: dto.fechaCierre,
    });

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

    const fechaAdquisicion =
      dto.tipoInstrumento === TipoInstrumento.RFI ? null : null;

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
        fechaManifestacionInteres: null,
        fechaAdquisicionDerecho: null,
        fechaReunionAclaratoria: null,
        fechaVisitaTecnica: null,
        fechaSolicitudesAclaracion: null,
        fechaRespuestaAclaracion: null,
        fechaLimitacionMypymes: null,
        eliminado: false,
      });

      const procesoGuardado = await manager.save(proceso);

      await this.asignarCodigoProceso(
        manager,
        procesoGuardado.id,
        procesoGuardado.idDigitado,
      );

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
            aplica: tareaAplicaParaProceso(
              tareaCodigo,
              dto.tipoInstrumento,
              fechaAdquisicion,
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

    if (dto.proyeccionId) {
      await this.proyeccionesService.vincularProcesoResultante(
        dto.proyeccionId,
        { procesoResultanteId: reloaded.id },
        actorId,
        paisSesionId,
      );
    }

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
    if (!this.permisosService.puedeEditarFechas(rol)) {
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

    const cambiosFechas: Array<{
      campo: string;
      anterior: string | null;
      nuevo: string | null;
    }> = [];

    const registrarCambio = (
      campo: string,
      anterior: string | null,
      nuevo: string | null,
    ) => {
      if (anterior !== nuevo) {
        cambiosFechas.push({ campo, anterior, nuevo });
      }
    };

    if (dto.fechaApertura !== undefined) {
      registrarCambio('fechaApertura', proceso.fechaApertura, dto.fechaApertura);
      proceso.fechaApertura = dto.fechaApertura;
    }
    if (dto.fechaCierre !== undefined) {
      registrarCambio('fechaCierre', proceso.fechaCierre, dto.fechaCierre);
      proceso.fechaCierre = dto.fechaCierre;
    }
    if (dto.fechaManifestacionInteres !== undefined) {
      registrarCambio(
        'fechaManifestacionInteres',
        proceso.fechaManifestacionInteres,
        dto.fechaManifestacionInteres,
      );
      proceso.fechaManifestacionInteres = dto.fechaManifestacionInteres;
    }
    if (dto.fechaAdquisicionDerecho !== undefined) {
      this.validateRfiFechas(proceso.tipoInstrumento, dto.fechaAdquisicionDerecho);
      registrarCambio(
        'fechaAdquisicionDerecho',
        proceso.fechaAdquisicionDerecho,
        dto.fechaAdquisicionDerecho,
      );
      proceso.fechaAdquisicionDerecho = dto.fechaAdquisicionDerecho;
    }
    if (dto.fechaReunionAclaratoria !== undefined) {
      registrarCambio(
        'fechaReunionAclaratoria',
        proceso.fechaReunionAclaratoria,
        dto.fechaReunionAclaratoria,
      );
      proceso.fechaReunionAclaratoria = dto.fechaReunionAclaratoria;
    }
    if (dto.fechaVisitaTecnica !== undefined) {
      registrarCambio(
        'fechaVisitaTecnica',
        proceso.fechaVisitaTecnica,
        dto.fechaVisitaTecnica,
      );
      proceso.fechaVisitaTecnica = dto.fechaVisitaTecnica;
    }
    if (dto.fechaSolicitudesAclaracion !== undefined) {
      registrarCambio(
        'fechaSolicitudesAclaracion',
        proceso.fechaSolicitudesAclaracion,
        dto.fechaSolicitudesAclaracion,
      );
      proceso.fechaSolicitudesAclaracion = dto.fechaSolicitudesAclaracion;
    }
    if (dto.fechaRespuestaAclaracion !== undefined) {
      registrarCambio(
        'fechaRespuestaAclaracion',
        proceso.fechaRespuestaAclaracion,
        dto.fechaRespuestaAclaracion,
      );
      proceso.fechaRespuestaAclaracion = dto.fechaRespuestaAclaracion;
    }
    if (dto.fechaLimitacionMypymes !== undefined) {
      registrarCambio(
        'fechaLimitacionMypymes',
        proceso.fechaLimitacionMypymes,
        dto.fechaLimitacionMypymes,
      );
      proceso.fechaLimitacionMypymes = dto.fechaLimitacionMypymes;
    }

    if (!proceso.fechaApertura || !proceso.fechaCierre) {
      throw new BusinessException(
        ErrorCode.PROCESO_FECHAS_PENDIENTES,
        'Debe registrar fecha de apertura y fecha de cierre',
        HttpStatus.BAD_REQUEST,
      );
    }

    validateFechasEnRango({
      fechaApertura: proceso.fechaApertura,
      fechaCierre: proceso.fechaCierre,
      fechaManifestacionInteres: proceso.fechaManifestacionInteres,
      fechaAdquisicionDerecho: proceso.fechaAdquisicionDerecho,
      fechaReunionAclaratoria: proceso.fechaReunionAclaratoria,
      fechaVisitaTecnica: proceso.fechaVisitaTecnica,
      fechaSolicitudesAclaracion: proceso.fechaSolicitudesAclaracion,
      fechaRespuestaAclaracion: proceso.fechaRespuestaAclaracion,
      fechaLimitacionMypymes: proceso.fechaLimitacionMypymes,
    });

    const saved = await this.procesoRepository.save(proceso);
    await this.sincronizarTareasAplica(saved);

    for (const cambio of cambiosFechas) {
      await this.auditService.log({
        usuarioId: actorId,
        accion: AuditAccion.PROCESO_FECHA_EDITAR,
        entidadTipo: AuditEntidadTipo.PROCESO,
        entidadId: saved.id,
        campo: cambio.campo,
        valorAnterior: cambio.anterior,
        valorNuevo: cambio.nuevo,
      });
    }

    if (cambiosFechas.length > 0) {
      await this.auditService.log({
        usuarioId: actorId,
        accion: AuditAccion.PROCESO_EDITAR,
        entidadTipo: AuditEntidadTipo.PROCESO,
        entidadId: saved.id,
        valorAnterior,
        valorNuevo: JSON.stringify(this.toResponse(saved, proceso.indicadores)),
      });
    }

    return this.toResponse(saved, proceso.indicadores);
  }

  async cambiarEstado(
    id: number,
    dto: CambiarEstadoProcesoDto,
    actorId: number,
    paisSesionId: number,
    rol: Rol,
  ): Promise<CambiarEstadoProcesoResult> {
    this.assertPuedeGestionar(rol);
    const proceso = await this.getProcesoActivoOrFail(id, paisSesionId, {
      indicadores: true,
    });
    const valorAnterior = JSON.stringify(this.toResponse(proceso, proceso.indicadores));

    const permitidos = TRANSICIONES_ESTADO[proceso.estado] ?? [];

    if (!permitidos.includes(dto.estado)) {
      throw new BusinessException(
        ErrorCode.PROCESO_ESTADO_INVALIDO,
        `No se puede cambiar de ${proceso.estado} a ${dto.estado}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      proceso.estado === EstadoProceso.POR_VALIDAR &&
      dto.estado === EstadoProceso.EN_PROCESO
    ) {
      this.assertIndicadoresValidados(proceso.indicadores ?? []);

      if (!proceso.fechaApertura || !proceso.fechaCierre) {
        throw new BusinessException(
          ErrorCode.PROCESO_FECHAS_PENDIENTES,
          'Debe configurar las fechas del proceso antes de pasar a En Proceso',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (
      proceso.estado === EstadoProceso.EN_PROCESO &&
      dto.estado === EstadoProceso.EN_VALIDACION
    ) {
      throw new BusinessException(
        ErrorCode.PROCESO_ESTADO_INVALIDO,
        'Use la asignación de validadores para pasar a En Validación',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (proceso.estado === EstadoProceso.EN_VALIDACION) {
      throw new BusinessException(
        ErrorCode.PROCESO_ESTADO_INVALIDO,
        'El estado En Validación solo cambia mediante veredictos de validación',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (requiereMotivoPerdida(proceso.estado, dto.estado)) {
      this.validarMotivoPerdida(dto.motivoPerdida, dto.motivoPerdidaOtro);
    }

    const estadoPrevio = proceso.estado;
    proceso.estado = dto.estado;

    if (dto.estado === EstadoProceso.ADJUDICADO) {
      proceso.fueAdjudicado = true;
    }

    if (requiereMotivoPerdida(estadoPrevio, dto.estado)) {
      this.aplicarMotivoPerdida(proceso, dto.motivoPerdida!, dto.motivoPerdidaOtro, actorId);
    }

    const saved = await this.procesoRepository.save(proceso);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.PROCESO_CAMBIAR_ESTADO,
      entidadTipo: AuditEntidadTipo.PROCESO,
      entidadId: saved.id,
      valorAnterior,
      valorNuevo: JSON.stringify(this.toResponse(saved)),
    });

    let proyeccionGenerada: ProyeccionResponseDto | null = null;

    if (dto.estado === EstadoProceso.ADJUDICADO) {
      try {
        proyeccionGenerada =
          await this.proyeccionesService.generarDesdeProcesoAdjudicado(
            saved.id,
            actorId,
          );
      } catch (error) {
        proceso.estado = estadoPrevio;
        await this.procesoRepository.save(proceso);
        throw error;
      }
    }

    return {
      proceso: await this.findById(saved.id, paisSesionId),
      proyeccionGenerada,
    };
  }

  async registrarMotivoPerdida(
    id: number,
    dto: RegistrarMotivoPerdidaDto,
    actorId: number,
    paisSesionId: number,
    rol: Rol,
  ): Promise<ProcesoResponseDto> {
    this.assertPuedeGestionar(rol);
    const proceso = await this.getProcesoActivoOrFail(id, paisSesionId);

    if (!procesoRequiereMotivoBackfill(proceso)) {
      throw new BusinessException(
        ErrorCode.PROCESO_MOTIVO_PERDIDA_NO_APLICA,
        'Este proceso no requiere registrar motivo de no adjudicación',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.validarMotivoPerdida(dto.motivoPerdida, dto.motivoPerdidaOtro);
    this.aplicarMotivoPerdida(proceso, dto.motivoPerdida, dto.motivoPerdidaOtro, actorId);

    const saved = await this.procesoRepository.save(proceso);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.PROCESO_EDITAR,
      entidadTipo: AuditEntidadTipo.PROCESO,
      entidadId: saved.id,
      campo: 'motivo_perdida',
      valorAnterior: null,
      valorNuevo: JSON.stringify({
        motivoPerdida: saved.motivoPerdida,
        motivoPerdidaOtro: saved.motivoPerdidaOtro,
      }),
    });

    return this.findById(saved.id, paisSesionId);
  }

  private validarMotivoPerdida(
    motivoPerdida: MotivoPerdidaProceso | undefined,
    motivoPerdidaOtro: string | undefined,
  ): void {
    if (!motivoPerdida) {
      throw new BusinessException(
        ErrorCode.PROCESO_MOTIVO_PERDIDA_REQUERIDO,
        'Debe indicar el motivo de descarte o no adjudicación',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (motivoPerdida === MotivoPerdidaProceso.OTRO) {
      const otro = motivoPerdidaOtro?.trim() ?? '';
      if (!otro) {
        throw new BusinessException(
          ErrorCode.PROCESO_MOTIVO_OTRO_REQUERIDO,
          'Debe describir el motivo cuando selecciona Otro',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  private aplicarMotivoPerdida(
    proceso: Proceso,
    motivoPerdida: MotivoPerdidaProceso,
    motivoPerdidaOtro: string | undefined,
    actorId: number,
  ): void {
    proceso.motivoPerdida = motivoPerdida;
    proceso.motivoPerdidaOtro =
      motivoPerdida === MotivoPerdidaProceso.OTRO
        ? motivoPerdidaOtro?.trim() ?? null
        : null;
    proceso.motivoPerdidaRegistradoEn = new Date();
    proceso.motivoPerdidaUsuarioId = actorId;
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
        'Solo el Administrador puede eliminar procesos directamente',
        HttpStatus.FORBIDDEN,
      );
    }

    const proceso = await this.getProcesoActivoOrFail(id, paisSesionId);
    const dependencias =
      await this.eliminacionDependenciasService.verificarProceso(proceso.id);

    this.eliminacionDependenciasService.assertPuedeEliminar(
      dependencias,
      confirmarDependientes,
      this.permisosService.puedeEliminarDirecto(rol),
    );

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

  async getDependencias(id: number, paisSesionId: number) {
    await this.getProcesoActivoOrFail(id, paisSesionId);
    return this.eliminacionDependenciasService.verificarProceso(id);
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
    archivo?: Express.Multer.File,
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

    const nota = dto.evidencia?.trim() || null;
    const tieneArchivo = Boolean(archivo?.buffer?.length);

    if (!nota && !tieneArchivo) {
      throw new BusinessException(
        ErrorCode.TAREA_EVIDENCIA_REQUERIDA,
        'Debe adjuntar un archivo o escribir una evidencia para completar la tarea',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!dto.confirmar) {
      throw new BusinessException(
        ErrorCode.TAREA_CONFIRMACION_REQUERIDA,
        'Debe confirmar la finalización de la tarea',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (tieneArchivo && archivo) {
      const savedFile = await this.guardarArchivoEvidencia(
        procesoId,
        tareaId,
        archivo,
      );
      tarea.evidenciaArchivoNombre = savedFile.nombre;
      tarea.evidenciaArchivoRuta = savedFile.rutaRelativa;
    }

    tarea.evidencia = nota;
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

    return {
      ...this.toTareaResponse(saved),
      avancePorcentaje: await this.getAvancePorcentaje(procesoId),
    };
  }

  async getArchivoEvidencia(
    procesoId: number,
    tareaId: number,
    paisSesionId: number,
  ): Promise<{ absolutePath: string; nombre: string }> {
    await this.getProcesoActivoOrFail(procesoId, paisSesionId);

    const tarea = await this.tareaRepository.findOne({
      where: { id: tareaId, procesoId },
    });

    if (!tarea?.evidenciaArchivoRuta || !tarea.evidenciaArchivoNombre) {
      throw new BusinessException(
        ErrorCode.TAREA_NO_ENCONTRADA,
        'Esta tarea no tiene archivo de evidencia adjunto',
        HttpStatus.NOT_FOUND,
      );
    }

    const absolutePath = path.join(process.cwd(), tarea.evidenciaArchivoRuta);
    if (!fs.existsSync(absolutePath)) {
      throw new BusinessException(
        ErrorCode.TAREA_NO_ENCONTRADA,
        'El archivo de evidencia no está disponible',
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      absolutePath,
      nombre: tarea.evidenciaArchivoNombre,
    };
  }

  private async guardarArchivoEvidencia(
    procesoId: number,
    tareaId: number,
    archivo: Express.Multer.File,
  ): Promise<{ nombre: string; rutaRelativa: string }> {
    const safeName = archivo.originalname.replace(/[^\w.\-()\sÀ-ÿ]/g, '_');
    const dirRelativo = path.join(
      'uploads',
      'evidencias',
      String(procesoId),
      String(tareaId),
    );
    const dirAbsoluto = path.join(process.cwd(), dirRelativo);
    await fs.promises.mkdir(dirAbsoluto, { recursive: true });

    const nombreArchivo = `${Date.now()}-${safeName}`;
    const rutaAbsoluta = path.join(dirAbsoluto, nombreArchivo);
    await fs.promises.writeFile(rutaAbsoluta, archivo.buffer);

    return {
      nombre: archivo.originalname,
      rutaRelativa: path.join(dirRelativo, nombreArchivo).replace(/\\/g, '/'),
    };
  }

  async getAvancePorcentaje(procesoId: number): Promise<number> {
    const rows = await this.procesoRepository.query(
      `SELECT avance_porcentaje AS avance
       FROM vista_procesos_avance
       WHERE proceso_id = ?`,
      [procesoId],
    );

    return Number(rows[0]?.avance ?? rows[0]?.avance_porcentaje ?? 0);
  }

  async getProcesoActivoOrFail(
    id: number,
    paisSesionId: number,
    relations: { indicadores?: boolean; motivoPerdidaUsuario?: boolean } = {},
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

  private async sincronizarTareasAplica(proceso: Proceso): Promise<void> {
    const tareas = await this.tareaRepository.find({
      where: { procesoId: proceso.id },
    });

    for (const tarea of tareas) {
      const aplica = tareaAplicaParaProceso(
        tarea.tareaCodigo as TareaCodigo,
        proceso.tipoInstrumento,
        proceso.fechaAdquisicionDerecho,
      );

      if (tarea.aplica !== aplica) {
        tarea.aplica = aplica;
        await this.tareaRepository.save(tarea);
      }
    }
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

  private async loadCalculosProcesos(
    procesoIds: number[],
  ): Promise<Map<number, Record<string, unknown>>> {
    if (procesoIds.length === 0) {
      return new Map();
    }

    const placeholders = procesoIds.map(() => '?').join(',');
    const rows = await this.procesoRepository.query(
      `SELECT
         vc.id,
         vc.empresa_mostrar AS empresaMostrar,
         vc.dias_restantes_cierre AS diasRestantesCierre,
         COALESCE(va.avance_porcentaje, 0) AS avancePorcentaje,
         vc.dias_espera AS diasEspera,
         vc.fecha_esperada AS fechaEsperada,
         vc.meses_ejecucion_anio_reporte AS mesesEjecucionAnioReporte,
         vc.facturacion_estimada_anio_reporte AS facturacionEstimadaAnioReporte
       FROM vista_procesos_calculado vc
       LEFT JOIN vista_procesos_avance va ON va.proceso_id = vc.id
       WHERE vc.id IN (${placeholders})`,
      procesoIds,
    );

    return new Map(
      rows.map((row: Record<string, unknown>) => {
        const id = Number(row.id);
        return [
          id,
          {
            ...row,
            avancePorcentaje: Number(
              row.avancePorcentaje ?? row.avance_porcentaje ?? 0,
            ),
            diasRestantesCierre: Number(
              row.diasRestantesCierre ?? row.dias_restantes_cierre ?? 0,
            ),
            diasEspera:
              row.diasEspera !== undefined && row.diasEspera !== null
                ? Number(row.diasEspera)
                : row.dias_espera !== undefined && row.dias_espera !== null
                  ? Number(row.dias_espera)
                  : null,
            empresaMostrar: row.empresaMostrar ?? row.empresa_mostrar ?? null,
            fechaEsperada: row.fechaEsperada ?? row.fecha_esperada ?? null,
            mesesEjecucionAnioReporte:
              row.mesesEjecucionAnioReporte ??
              row.meses_ejecucion_anio_reporte ??
              null,
            facturacionEstimadaAnioReporte:
              row.facturacionEstimadaAnioReporte ??
              row.facturacion_estimada_anio_reporte ??
              null,
          },
        ];
      }),
    );
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
    calculos?: Record<string, unknown>,
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
      motivoPerdida: proceso.motivoPerdida,
      motivoPerdidaOtro: proceso.motivoPerdidaOtro,
      motivoPerdidaRegistradoEn: proceso.motivoPerdidaRegistradoEn,
      motivoPerdidaUsuarioId: proceso.motivoPerdidaUsuarioId,
      motivoPerdidaUsuarioNombre: proceso.motivoPerdidaUsuario?.nombre ?? null,
      fueAdjudicado: proceso.fueAdjudicado,
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
      empresaMostrar: (calculos?.empresaMostrar as string | undefined) ?? null,
      diasRestantesCierre:
        calculos?.diasRestantesCierre !== undefined
          ? Number(calculos.diasRestantesCierre)
          : null,
      avancePorcentaje:
        calculos?.avancePorcentaje !== undefined
          ? Number(calculos.avancePorcentaje)
          : null,
      diasEspera:
        calculos?.diasEspera !== undefined && calculos.diasEspera !== null
          ? Number(calculos.diasEspera)
          : null,
      fechaEsperada: (calculos?.fechaEsperada as string | undefined) ?? null,
      mesesEjecucionAnioReporte:
        calculos?.mesesEjecucionAnioReporte !== undefined &&
        calculos.mesesEjecucionAnioReporte !== null
          ? Number(calculos.mesesEjecucionAnioReporte)
          : null,
      facturacionEstimadaAnioReporte:
        (calculos?.facturacionEstimadaAnioReporte as string | undefined) ?? null,
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
      evidenciaArchivoNombre: tarea.evidenciaArchivoNombre,
      evidenciaUrl: tarea.evidenciaArchivoRuta
        ? `/api/v1/procesos/${tarea.procesoId}/tareas/${tarea.id}/evidencia`
        : null,
      completada: tarea.completada,
      fechaCompletada: tarea.fechaCompletada,
      usuarioCompletoId: tarea.usuarioCompletoId,
    };
  }

  private async asignarCodigoProceso(
    manager: EntityManager,
    procesoId: number,
    idDigitado: string,
  ): Promise<void> {
    const row = await manager
      .createQueryBuilder(Proceso, 'p')
      .select('COUNT(*)', 'veces')
      .where('p.idDigitado = :idDigitado COLLATE utf8mb4_unicode_ci', {
        idDigitado,
      })
      .getRawOne<{ veces: string }>();

    const total = Number(row?.veces ?? 0);
    const codigo =
      total > 1 ? `${idDigitado}-d-${procesoId}` : `${idDigitado}-${procesoId}`;
    await manager.update(Proceso, { id: procesoId }, { codigo });
  }
}
