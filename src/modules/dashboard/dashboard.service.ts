import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Repository } from 'typeorm';
import { AuditAccion, AuditEntidadTipo } from '../../common/enums/audit-accion.enum';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { EstadoProceso } from '../../common/enums/estado-proceso.enum';
import { EstadoProyeccion } from '../../common/enums/estado-proyeccion.enum';
import { EstadoUsuario } from '../../common/enums/estado-usuario.enum';
import { FiltroEliminados } from '../../common/enums/filtro-eliminados.enum';
import { MercadoProyeccion } from '../../common/enums/mercado-proyeccion.enum';
import { ResultadoRelacionamiento } from '../../common/enums/resultado-relacionamiento.enum';
import { Rol } from '../../common/enums/rol.enum';
import { PermisosService } from '../../common/services/permisos.service';
import { resolveFiltroEliminados } from '../../common/utils/filtro-eliminados.util';
import {
  buildWorkbookBuffer,
  type SpreadsheetSheet,
} from '../../common/utils/spreadsheet-writer';
import { MetaAnual } from '../../database/entities/meta-anual.entity';
import { Pais } from '../../database/entities/pais.entity';
import { Proceso } from '../../database/entities/proceso.entity';
import { Proyeccion } from '../../database/entities/proyeccion.entity';
import { ReporteGenerado } from '../../database/entities/reporte-generado.entity';
import { AuditService } from '../audit/audit.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { ProyeccionesService } from '../proyecciones/proyecciones.service';
import {
  AnaliticaCierresVentanaDto,
  AnaliticaConteoDto,
  AnaliticaDashboardDto,
  AnaliticaEmbudoEtapaDto,
  AnaliticaGaugesDto,
  AnaliticaProyeccionEstadoMercadoDto,
} from './dto/analitica-dashboard.dto';
import { DashboardExportQueryDto, DashboardProcesosQueryDto } from './dto/dashboard-query.dto';
import { UpsertMetasAnualesDto } from './dto/upsert-metas.dto';

export const EXPORT_MAX_ROWS = 10_000;
export const DASHBOARD_PROCESOS_MAX_ROWS = 200;

export interface DashboardResumenDto {
  totalProcesos: number;
  porEstado: Array<{ estado: string; total: number }>;
  porSegmento: Array<{ segmento: string; total: number }>;
}

export interface DashboardProcesoDto {
  id: number;
  codigo: string | null;
  empresaMostrar: string;
  estado: string;
  segmento: string;
  cuantia: string;
  diasRestantesCierre: number;
  avancePorcentaje: number;
  facturacionEstimadaAnioReporte: string;
  fechaInicioEjecucion: string | null;
  fechaFinalizacion: string | null;
  diasEspera: number | null;
  fechaEsperada: string | null;
  mesesEjecucionAnioReporte: number | null;
}

export interface DashboardProyeccionesDto {
  anio: number;
  totalProyeccionesActivas: number;
  sumaValorVenta: string;
  sumaValorFacturacion: string;
  porEstado: Array<{ estado: string; total: number; sumaVenta: string; sumaFacturacion: string }>;
  porMercado: Array<{ mercado: string | null; total: number; sumaVenta: string; sumaFacturacion: string }>;
}

const RFI_FILTER = `p.tipo_instrumento <> 'RFI'`;

function buildDateFilter(
  column: string,
  desde?: string,
  hasta?: string,
): { sql: string; params: string[] } {
  const parts: string[] = [];
  const params: string[] = [];
  if (desde) {
    parts.push(`${column} >= ?`);
    params.push(desde);
  }
  if (hasta) {
    parts.push(`${column} <= ?`);
    params.push(hasta);
  }
  return { sql: parts.length ? ' AND ' + parts.join(' AND ') : '', params };
}

const ESTADOS_GAUGE_PROYECTADA = [
  EstadoProceso.ADJUDICADO,
  EstadoProceso.PRESENTADO,
  EstadoProceso.SUBSANACION,
];

export function porcentajeVsMeta(
  valor: string | number,
  meta: string | number | null | undefined,
): number | null {
  const techo = Number(meta);
  if (!Number.isFinite(techo) || techo <= 0) {
    return null;
  }

  const monto = Number(valor);
  if (!Number.isFinite(monto)) {
    return 0;
  }

  return (monto / techo) * 100;
}

function toMoneyString(value: unknown): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) {
    return '0';
  }
  return n.toFixed(2);
}

export interface ReporteGeneradoDto {
  id: number;
  tipo: string;
  periodo: string;
  paisId: number;
  nombreArchivo: string;
  tamanoBytes: number;
  generadoEn: Date;
  generadoPor: string;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Proceso)
    private readonly procesoRepository: Repository<Proceso>,
    @InjectRepository(Proyeccion)
    private readonly proyeccionRepository: Repository<Proyeccion>,
    @InjectRepository(ReporteGenerado)
    private readonly reporteRepository: Repository<ReporteGenerado>,
    @InjectRepository(Pais)
    private readonly paisRepository: Repository<Pais>,
    @InjectRepository(MetaAnual)
    private readonly metaAnualRepository: Repository<MetaAnual>,
    private readonly notificacionesService: NotificacionesService,
    private readonly permisosService: PermisosService,
    private readonly proyeccionesService: ProyeccionesService,
    private readonly auditService: AuditService,
  ) {}

  async getResumen(paisSesionId: number, desde?: string, hasta?: string): Promise<DashboardResumenDto> {
    const df = buildDateFilter('p.fecha_apertura', desde, hasta);

    const totalRows = await this.procesoRepository.query(
      `SELECT COUNT(*) AS total
       FROM procesos p
       WHERE p.eliminado = FALSE AND p.pais_id = ? AND ${RFI_FILTER}${df.sql}`,
      [paisSesionId, ...df.params],
    );

    const porEstado = await this.procesoRepository.query(
      `SELECT p.estado, COUNT(*) AS total
       FROM procesos p
       WHERE p.eliminado = FALSE AND p.pais_id = ? AND ${RFI_FILTER}${df.sql}
       GROUP BY p.estado
       ORDER BY p.estado ASC`,
      [paisSesionId, ...df.params],
    );

    const porSegmento = await this.procesoRepository.query(
      `SELECT p.segmento, COUNT(*) AS total
       FROM procesos p
       WHERE p.eliminado = FALSE AND p.pais_id = ? AND ${RFI_FILTER}${df.sql}
       GROUP BY p.segmento
       ORDER BY p.segmento ASC`,
      [paisSesionId, ...df.params],
    );

    return {
      totalProcesos: Number(totalRows[0]?.total ?? 0),
      porEstado: porEstado.map((row: { estado: string; total: string }) => ({
        estado: row.estado,
        total: Number(row.total),
      })),
      porSegmento: porSegmento.map(
        (row: { segmento: string; total: string }) => ({
          segmento: row.segmento,
          total: Number(row.total),
        }),
      ),
    };
  }

  async getProcesos(
    paisSesionId: number,
    query: DashboardProcesosQueryDto,
    rol: Rol = Rol.OPERADOR,
  ): Promise<DashboardProcesoDto[]> {
    if (!this.hasProcesosFiltros(query)) {
      return [];
    }

    return this.queryProcesosFiltrados(
      paisSesionId,
      query,
      rol,
      DASHBOARD_PROCESOS_MAX_ROWS,
    );
  }

  async getProyecciones(
    paisSesionId: number,
    anio?: number,
    desde?: string,
    hasta?: string,
  ): Promise<DashboardProyeccionesDto> {
    const anioFiltro = anio ?? new Date().getFullYear();
    const estadosExcluidos = [
      EstadoProyeccion.CERRADO,
      EstadoProyeccion.PUBLICADO,
    ];
    const df = buildDateFilter('fecha_estimada_publicacion', desde, hasta);

    const totalRows = await this.proyeccionRepository.query(
      `SELECT
         COUNT(*) AS total,
         COALESCE(SUM(valor_venta), 0) AS sumaVenta,
         COALESCE(SUM(valor_facturacion), 0) AS sumaFacturacion
       FROM proyecciones
       WHERE eliminado = FALSE
         AND pais_id = ?
         AND anio_proyectado = ?
         AND estado NOT IN (?, ?)${df.sql}`,
      [paisSesionId, anioFiltro, ...estadosExcluidos, ...df.params],
    );

    const porEstado = await this.proyeccionRepository.query(
      `SELECT estado,
              COUNT(*) AS total,
              COALESCE(SUM(valor_venta), 0) AS sumaVenta,
              COALESCE(SUM(valor_facturacion), 0) AS sumaFacturacion
       FROM proyecciones
       WHERE eliminado = FALSE
         AND pais_id = ?
         AND anio_proyectado = ?
         AND estado NOT IN (?, ?)${df.sql}
       GROUP BY estado
       ORDER BY estado ASC`,
      [paisSesionId, anioFiltro, ...estadosExcluidos, ...df.params],
    );

    const porMercado = await this.proyeccionRepository.query(
      `SELECT mercado,
              COUNT(*) AS total,
              COALESCE(SUM(valor_venta), 0) AS sumaVenta,
              COALESCE(SUM(valor_facturacion), 0) AS sumaFacturacion
       FROM proyecciones
       WHERE eliminado = FALSE
         AND pais_id = ?
         AND anio_proyectado = ?
         AND estado NOT IN (?, ?)${df.sql}
       GROUP BY mercado
       ORDER BY mercado ASC`,
      [paisSesionId, anioFiltro, ...estadosExcluidos, ...df.params],
    );

    return {
      anio: anioFiltro,
      totalProyeccionesActivas: Number(totalRows[0]?.total ?? 0),
      sumaValorVenta: String(totalRows[0]?.sumaVenta ?? '0'),
      sumaValorFacturacion: String(totalRows[0]?.sumaFacturacion ?? '0'),
      porEstado: porEstado.map(
        (row: {
          estado: string;
          total: string;
          sumaVenta: string;
          sumaFacturacion: string;
        }) => ({
          estado: row.estado,
          total: Number(row.total),
          sumaVenta: String(row.sumaVenta),
          sumaFacturacion: String(row.sumaFacturacion),
        }),
      ),
      porMercado: porMercado.map(
        (row: {
          mercado: string | null;
          total: string;
          sumaVenta: string;
          sumaFacturacion: string;
        }) => ({
          mercado: row.mercado,
          total: Number(row.total),
          sumaVenta: String(row.sumaVenta),
          sumaFacturacion: String(row.sumaFacturacion),
        }),
      ),
    };
  }

  async getAnalitica(
    paisSesionId: number,
    anio?: number,
    desde?: string,
    hasta?: string,
  ): Promise<AnaliticaDashboardDto> {
    const anioFiltro = anio ?? new Date().getFullYear();

    const [
      resumen,
      proyecciones,
      kpisRow,
      cierresRows,
      proyeccionesEstadoMercadoRows,
      efectividadMercado,
      crmPorCanal,
      crmPorResultado,
      crmPorSegmento,
      crmEstadoRespuesta,
      crmActividad,
      gauges,
    ] = await Promise.all([
      this.getResumen(paisSesionId, desde, hasta),
      this.getProyecciones(paisSesionId, anioFiltro, desde, hasta),
      this.queryAnaliticaKpis(paisSesionId, desde, hasta),
      this.queryCierresPorVentana(paisSesionId, desde, hasta),
      this.queryProyeccionesPorEstadoMercado(paisSesionId, anioFiltro, desde, hasta),
      this.proyeccionesService.getEfectividadMercado(anioFiltro, paisSesionId),
      this.queryCrmPorCampo(paisSesionId, 'r.canal', desde, hasta),
      this.queryCrmPorCampo(paisSesionId, 'r.resultado', desde, hasta),
      this.queryCrmPorSegmentoCliente(paisSesionId),
      this.queryCrmEstadoRespuesta(paisSesionId, desde, hasta),
      this.queryCrmActividad(paisSesionId, desde, hasta),
      this.queryGauges(paisSesionId, anioFiltro),
    ]);

    const embudoRows = await this.queryEmbudoComercial(
      paisSesionId,
      proyecciones.totalProyeccionesActivas,
    );

    return {
      anio: anioFiltro,
      kpis: {
        procesosActivos: Number(kpisRow.procesosActivos ?? 0),
        proyeccionesActivas: proyecciones.totalProyeccionesActivas,
        cierresProximos30Dias: Number(kpisRow.cierresProximos30Dias ?? 0),
        validacionesPendientes: Number(kpisRow.validacionesPendientes ?? 0),
        relacionamientosVencidos: Number(kpisRow.relacionamientosVencidos ?? 0),
        clientesActivos: Number(kpisRow.clientesActivos ?? 0),
        contactosActivos: Number(kpisRow.contactosActivos ?? 0),
        relacionamientosTotal: Number(kpisRow.relacionamientosTotal ?? 0),
        reunionesProgramadas: Number(kpisRow.reunionesProgramadas ?? 0),
      },
      resumen,
      proyecciones,
      gauges,
      embudo: embudoRows,
      cierresPorVentana: cierresRows,
      proyeccionesPorEstadoMercado: proyeccionesEstadoMercadoRows,
      efectividadMercado: {
        anio: anioFiltro,
        general: {
          pctGanadasDeMaterializadas:
            efectividadMercado.general.pctGanadasDeMaterializadas,
          materializadas: efectividadMercado.general.materializadas,
          ganadas: efectividadMercado.general.ganadas,
        },
        objetivo: {
          pctGanadasDeMaterializadas:
            efectividadMercado.objetivo.pctGanadasDeMaterializadas,
          materializadas: efectividadMercado.objetivo.materializadas,
          ganadas: efectividadMercado.objetivo.ganadas,
        },
      },
      crm: {
        porCanal: crmPorCanal,
        porResultado: crmPorResultado,
        porSegmentoCliente: crmPorSegmento,
        estadoRespuesta: crmEstadoRespuesta,
        actividadPorVentana: crmActividad,
      },
    };
  }

  async upsertMetas(
    paisSesionId: number,
    dto: UpsertMetasAnualesDto,
    actorId: number,
  ): Promise<{
    anio: number;
    metaAdjudicacion: string;
    metaFacturacion: string;
  }> {
    if (dto.metaAdjudicacion <= 0 || dto.metaFacturacion <= 0) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        'Las metas de adjudicación y facturación deben ser mayores que cero',
        HttpStatus.BAD_REQUEST,
      );
    }

    const metaAdjudicacion = toMoneyString(dto.metaAdjudicacion);
    const metaFacturacion = toMoneyString(dto.metaFacturacion);

    const existente = await this.metaAnualRepository.findOne({
      where: { paisId: paisSesionId, anio: dto.anio },
    });

    const anterior = existente
      ? JSON.stringify({
          anio: existente.anio,
          metaAdjudicacion: existente.metaAdjudicacion,
          metaFacturacion: existente.metaFacturacion,
        })
      : null;

    const registro = existente
      ? this.metaAnualRepository.merge(existente, {
          metaAdjudicacion,
          metaFacturacion,
          actualizadoPorId: actorId,
          fechaActualizacion: new Date(),
        })
      : this.metaAnualRepository.create({
          paisId: paisSesionId,
          anio: dto.anio,
          metaAdjudicacion,
          metaFacturacion,
          actualizadoPorId: actorId,
          fechaActualizacion: new Date(),
        });

    const saved = await this.metaAnualRepository.save(registro);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.META_ANUAL_UPSERT,
      entidadTipo: AuditEntidadTipo.META_ANUAL,
      entidadId: saved.id,
      valorAnterior: anterior,
      valorNuevo: JSON.stringify({
        anio: saved.anio,
        metaAdjudicacion: saved.metaAdjudicacion,
        metaFacturacion: saved.metaFacturacion,
      }),
    });

    return {
      anio: saved.anio,
      metaAdjudicacion: toMoneyString(saved.metaAdjudicacion),
      metaFacturacion: toMoneyString(saved.metaFacturacion),
    };
  }

  async exportarXlsx(
    paisSesionId: number,
    query: DashboardExportQueryDto = {},
    rol: Rol = Rol.OPERADOR,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const resumen = await this.getResumen(paisSesionId);
    const procesos = await this.getProcesosParaExport(paisSesionId, query, rol);
    const proyecciones = await this.getProyecciones(paisSesionId, query.anio);
    const fecha = new Date().toISOString().slice(0, 10);

    const sheets: SpreadsheetSheet[] = [
      {
        name: 'Resumen estado',
        rows: resumen.porEstado.map((item) => ({
          Estado: item.estado,
          Total: item.total,
        })),
      },
      {
        name: 'Resumen segmento',
        rows: resumen.porSegmento.map((item) => ({
          Segmento: item.segmento,
          Total: item.total,
        })),
      },
      {
        name: 'Procesos',
        rows: procesos.map((p) => ({
          Código: p.codigo,
          Empresa: p.empresaMostrar,
          Estado: p.estado,
          Segmento: p.segmento,
          Cuantía: p.cuantia,
          'Días restantes cierre': p.diasRestantesCierre,
          'Avance %': p.avancePorcentaje,
          'Facturación est.': p.facturacionEstimadaAnioReporte,
          'Inicio ejecución': p.fechaInicioEjecucion,
          Finalización: p.fechaFinalizacion,
        })),
      },
      {
        name: 'Proyecciones estado',
        rows: proyecciones.porEstado.map((item) => ({
          Estado: item.estado,
          Total: item.total,
          Venta: item.sumaVenta,
          Facturación: item.sumaFacturacion,
        })),
      },
      {
        name: 'Proyecciones mercado',
        rows: proyecciones.porMercado.map((item) => ({
          Mercado: item.mercado ?? 'Sin asignar',
          Total: item.total,
          Venta: item.sumaVenta,
          Facturación: item.sumaFacturacion,
        })),
      },
    ];

    return {
      buffer: buildWorkbookBuffer(sheets),
      filename: `dashboard-${fecha}.xlsx`,
    };
  }

  async listarReportes(
    paisSesionId: number,
  ): Promise<ReporteGeneradoDto[]> {
    const rows = await this.reporteRepository.find({
      where: { paisId: paisSesionId, tipo: 'dashboard_mensual' },
      order: { generadoEn: 'DESC' },
      take: 24,
    });

    return rows.map((row) => ({
      id: Number(row.id),
      tipo: row.tipo,
      periodo: row.periodo,
      paisId: Number(row.paisId),
      nombreArchivo: row.nombreArchivo,
      tamanoBytes: row.tamanoBytes,
      generadoEn: row.generadoEn,
      generadoPor: row.generadoPor,
    }));
  }

  async obtenerArchivoReporte(
    id: number,
    paisSesionId: number,
  ): Promise<{ absolutePath: string; nombre: string }> {
    const reporte = await this.reporteRepository.findOne({
      where: { id, paisId: paisSesionId },
    });

    if (!reporte) {
      throw new BusinessException(
        ErrorCode.RECURSO_NO_ENCONTRADO,
        'Reporte no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    const absolutePath = path.join(process.cwd(), reporte.rutaArchivo);
    if (!fs.existsSync(absolutePath)) {
      throw new BusinessException(
        ErrorCode.RECURSO_NO_ENCONTRADO,
        'Archivo de reporte no disponible',
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      absolutePath,
      nombre: reporte.nombreArchivo,
    };
  }

  async generarReportesMensuales(): Promise<{ reportesGenerados: number }> {
    const periodo = this.periodoMesAnterior();
    const paises = await this.paisRepository.find();
    let reportesGenerados = 0;

    for (const pais of paises) {
      const existente = await this.reporteRepository.findOne({
        where: {
          tipo: 'dashboard_mensual',
          periodo,
          paisId: pais.id,
        },
      });

      if (existente) {
        continue;
      }

      const archivo = await this.crearReporteMensualArchivo(
        Number(pais.id),
        periodo,
      );

      await this.reporteRepository.save(
        this.reporteRepository.create({
          tipo: 'dashboard_mensual',
          periodo,
          paisId: Number(pais.id),
          nombreArchivo: archivo.nombreArchivo,
          rutaArchivo: archivo.rutaRelativa,
          tamanoBytes: archivo.tamanoBytes,
          generadoPor: 'job_mensual',
        }),
      );

      const destinatarios = await this.resolverDestinatariosReporte(
        Number(pais.id),
      );

      for (const usuarioId of destinatarios) {
        await this.notificacionesService.crear({
          usuarioId,
          tipo: 'reporte_mensual_disponible',
          mensaje: `Reporte mensual ${periodo} disponible en el dashboard`,
          entidadTipo: 'dashboard',
        });
      }

      reportesGenerados += 1;
    }

    return { reportesGenerados };
  }

  private async getProcesosParaExport(
    paisSesionId: number,
    query: DashboardProcesosQueryDto,
    rol: Rol,
  ): Promise<DashboardProcesoDto[]> {
    if (!this.hasProcesosFiltros(query)) {
      // Exportación sin filtros: procesos activos (comportamiento histórico).
      return this.queryProcesosFiltrados(
        paisSesionId,
        {},
        rol,
        EXPORT_MAX_ROWS,
        true,
      );
    }

    return this.queryProcesosFiltrados(
      paisSesionId,
      query,
      rol,
      EXPORT_MAX_ROWS,
    );
  }

  private hasProcesosFiltros(query: DashboardProcesosQueryDto): boolean {
    return Boolean(
      query.search?.trim() ||
        query.estado ||
        query.segmento ||
        query.tipoProceso ||
        query.tipoInstrumento ||
        query.portalOrigen ||
        query.empresaClienteId ||
        query.fechaCierreDesde ||
        query.fechaCierreHasta ||
        (query.filtroEliminados &&
          query.filtroEliminados !== FiltroEliminados.ACTIVOS),
    );
  }

  private async queryProcesosFiltrados(
    paisSesionId: number,
    query: DashboardProcesosQueryDto,
    rol: Rol,
    limit: number,
    allowEmptyFilters = false,
  ): Promise<DashboardProcesoDto[]> {
    if (!allowEmptyFilters && !this.hasProcesosFiltros(query)) {
      return [];
    }

    if (
      query.fechaCierreDesde &&
      query.fechaCierreHasta &&
      query.fechaCierreDesde > query.fechaCierreHasta
    ) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        'La fecha de cierre desde no puede ser posterior a la fecha hasta',
        HttpStatus.BAD_REQUEST,
      );
    }

    const filtroEliminados = resolveFiltroEliminados(
      query.filtroEliminados,
      undefined,
      rol,
      this.permisosService,
    );

    const conditions: string[] = [
      'p.pais_id = ?',
      RFI_FILTER,
    ];
    const params: unknown[] = [paisSesionId];

    if (filtroEliminados === FiltroEliminados.ACTIVOS) {
      conditions.push('p.eliminado = FALSE');
    } else if (filtroEliminados === FiltroEliminados.SOLO_ELIMINADOS) {
      conditions.push('p.eliminado = TRUE');
    }

    if (query.estado) {
      conditions.push('p.estado = ?');
      params.push(query.estado);
    } else {
      conditions.push(`p.estado NOT IN (?, ?)`);
      params.push(EstadoProceso.CERRADO, EstadoProceso.DESCARTADO);
    }

    if (query.segmento) {
      conditions.push('p.segmento = ?');
      params.push(query.segmento);
    }

    if (query.tipoProceso) {
      conditions.push('p.tipo_proceso = ?');
      params.push(query.tipoProceso);
    }

    if (query.tipoInstrumento) {
      conditions.push('p.tipo_instrumento = ?');
      params.push(query.tipoInstrumento);
    }

    if (query.portalOrigen) {
      conditions.push('p.portal_origen = ?');
      params.push(query.portalOrigen);
    }

    if (query.empresaClienteId) {
      conditions.push('p.empresa_cliente_id = ?');
      params.push(query.empresaClienteId);
    }

    if (query.fechaCierreDesde) {
      conditions.push('p.fecha_cierre >= ?');
      params.push(query.fechaCierreDesde);
    }

    if (query.fechaCierreHasta) {
      conditions.push('p.fecha_cierre <= ?');
      params.push(query.fechaCierreHasta);
    }

    const term = query.search?.trim();
    if (term) {
      conditions.push(
        '(p.id_digitado LIKE ? OR p.codigo LIKE ? OR p.objeto LIKE ?)',
      );
      const pattern = `%${term}%`;
      params.push(pattern, pattern, pattern);
    }

    const rows = await this.procesoRepository.query(
      `SELECT
         vc.id,
         vc.codigo,
         vc.empresa_mostrar AS empresaMostrar,
         vc.estado,
         vc.segmento,
         vc.cuantia,
         vc.dias_restantes_cierre AS diasRestantesCierre,
         COALESCE(va.avance_porcentaje, 0) AS avancePorcentaje,
         vc.facturacion_estimada_anio_reporte AS facturacionEstimadaAnioReporte,
         vc.fecha_inicio_ejecucion AS fechaInicioEjecucion,
         vc.fecha_finalizacion AS fechaFinalizacion,
         vc.dias_espera AS diasEspera,
         vc.fecha_esperada AS fechaEsperada,
         vc.meses_ejecucion_anio_reporte AS mesesEjecucionAnioReporte
       FROM vista_procesos_calculado vc
       INNER JOIN procesos p ON p.id = vc.id
       LEFT JOIN vista_procesos_avance va ON va.proceso_id = vc.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY vc.dias_restantes_cierre ASC
       LIMIT ${limit}`,
      params,
    );

    return rows as DashboardProcesoDto[];
  }

  private async crearReporteMensualArchivo(
    paisId: number,
    periodo: string,
  ): Promise<{
    nombreArchivo: string;
    rutaRelativa: string;
    tamanoBytes: number;
  }> {
    const [anioStr] = periodo.split('-');
    const anio = Number(anioStr);
    const { buffer } = await this.exportarXlsx(paisId, { anio });
    const nombreArchivo = `dashboard-mensual-${periodo}-pais-${paisId}.xlsx`;
    const dirRelativo = path.join('uploads', 'reportes');
    const dirAbsoluto = path.join(process.cwd(), dirRelativo);
    await fs.promises.mkdir(dirAbsoluto, { recursive: true });

    const rutaAbsoluta = path.join(dirAbsoluto, nombreArchivo);
    await fs.promises.writeFile(rutaAbsoluta, buffer);

    return {
      nombreArchivo,
      rutaRelativa: path.join(dirRelativo, nombreArchivo).replace(/\\/g, '/'),
      tamanoBytes: buffer.length,
    };
  }

  private periodoMesAnterior(): string {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const mes = String(prev.getMonth() + 1).padStart(2, '0');

    return `${prev.getFullYear()}-${mes}`;
  }

  private async resolverDestinatariosReporte(_paisId: number): Promise<number[]> {
    const rows = await this.procesoRepository.query(
      `SELECT id
       FROM usuarios
       WHERE eliminado = FALSE
         AND estado = ?
         AND rol IN (?, ?)`,
      [EstadoUsuario.ACTIVO, Rol.ADMINISTRADOR, Rol.SUPERVISOR_SISTEMA],
    );

    return rows.map((row: { id: number }) => Number(row.id));
  }

  private async queryGauges(
    paisSesionId: number,
    anio: number,
  ): Promise<AnaliticaGaugesDto> {
    const facturacionAnio = `COALESCE(ROUND(
      (p.cuantia / NULLIF(p.plazo_ejecucion_meses, 0)) *
      GREATEST(0, COALESCE(TIMESTAMPDIFF(MONTH,
        GREATEST(p.fecha_inicio_ejecucion, MAKEDATE(?, 1)),
        LEAST(p.fecha_finalizacion, MAKEDATE(?, 1))
      ), 0))
    , 2), 0)`;

    const [meta, rows] = await Promise.all([
      this.metaAnualRepository.findOne({
        where: { paisId: paisSesionId, anio },
      }),
      this.procesoRepository.query(
        `SELECT
           COALESCE(SUM(CASE WHEN p.estado = ? THEN p.cuantia ELSE 0 END), 0) AS real_adjudicacion,
           COALESCE(SUM(CASE WHEN p.estado IN (?, ?, ?) THEN p.cuantia ELSE 0 END), 0) AS proyectada_adjudicacion,
           COALESCE(SUM(CASE WHEN p.estado = ? THEN ${facturacionAnio} ELSE 0 END), 0) AS real_facturacion,
           COALESCE(SUM(CASE WHEN p.estado IN (?, ?, ?) THEN ${facturacionAnio} ELSE 0 END), 0) AS proyectada_facturacion
         FROM procesos p
         WHERE p.eliminado = FALSE
           AND p.pais_id = ?
           AND ${RFI_FILTER}
           AND (
             (
               p.fecha_inicio_ejecucion IS NOT NULL
               AND p.fecha_finalizacion IS NOT NULL
               AND p.fecha_inicio_ejecucion < MAKEDATE(?, 1)
               AND p.fecha_finalizacion > MAKEDATE(?, 1)
             )
             OR (
               (p.fecha_inicio_ejecucion IS NULL OR p.fecha_finalizacion IS NULL)
               AND YEAR(p.fecha_cierre) = ?
             )
           )`,
        [
          EstadoProceso.ADJUDICADO,
          ...ESTADOS_GAUGE_PROYECTADA,
          EstadoProceso.ADJUDICADO,
          anio,
          anio + 1,
          ...ESTADOS_GAUGE_PROYECTADA,
          anio,
          anio + 1,
          paisSesionId,
          anio + 1,
          anio,
          anio,
        ],
      ),
    ]);

    const row = (rows[0] ?? {}) as {
      real_adjudicacion?: string;
      real_facturacion?: string;
      proyectada_adjudicacion?: string;
      proyectada_facturacion?: string;
    };

    return {
      metaAdjudicacion: meta ? toMoneyString(meta.metaAdjudicacion) : null,
      metaFacturacion: meta ? toMoneyString(meta.metaFacturacion) : null,
      real: {
        adjudicacion: toMoneyString(row.real_adjudicacion),
        facturacion: toMoneyString(row.real_facturacion),
      },
      proyectada: {
        adjudicacion: toMoneyString(row.proyectada_adjudicacion),
        facturacion: toMoneyString(row.proyectada_facturacion),
      },
    };
  }

  private async queryAnaliticaKpis(
    paisSesionId: number,
    desde?: string,
    hasta?: string,
  ): Promise<Record<string, unknown>> {
    const dfProc = buildDateFilter('p.fecha_apertura', desde, hasta);
    const dfRel = buildDateFilter('r.fecha_mensaje', desde, hasta);

    const rows = await this.procesoRepository.query(
      `SELECT
         (
           SELECT COUNT(*)
           FROM procesos p
           WHERE p.eliminado = FALSE
             AND p.pais_id = ?
             AND ${RFI_FILTER}
             AND p.estado NOT IN (?, ?)${dfProc.sql}
         ) AS procesosActivos,
         (
           SELECT COUNT(*)
           FROM procesos p
           WHERE p.eliminado = FALSE
             AND p.pais_id = ?
             AND ${RFI_FILTER}
             AND p.estado NOT IN (?, ?)
             AND p.fecha_cierre IS NOT NULL
             AND p.fecha_cierre >= CURDATE()
             AND p.fecha_cierre <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)${dfProc.sql}
         ) AS cierresProximos30Dias,
         (
           SELECT COUNT(*)
           FROM vista_procesos_por_validar v
           INNER JOIN procesos p ON p.id = v.proceso_id
           WHERE p.pais_id = ?
             AND p.eliminado = FALSE${dfProc.sql}
         ) AS validacionesPendientes,
         (
           SELECT COUNT(*)
           FROM vista_relacionamientos_vencidos v
           INNER JOIN relacionamientos r ON r.id = v.id
           INNER JOIN contactos co ON co.id = r.contacto_id
           INNER JOIN clientes cl ON cl.id = co.cliente_id
           WHERE cl.pais_id = ?${dfRel.sql}
         ) AS relacionamientosVencidos,
         (
           SELECT COUNT(*)
           FROM clientes cl
           WHERE cl.pais_id = ?
             AND cl.eliminado = FALSE
         ) AS clientesActivos,
         (
           SELECT COUNT(*)
           FROM contactos co
           INNER JOIN clientes cl ON cl.id = co.cliente_id
           WHERE cl.pais_id = ?
             AND cl.eliminado = FALSE
             AND co.eliminado = FALSE
         ) AS contactosActivos,
         (
           SELECT COUNT(*)
           FROM relacionamientos r
           INNER JOIN contactos co ON co.id = r.contacto_id
           INNER JOIN clientes cl ON cl.id = co.cliente_id
           WHERE cl.pais_id = ?
             AND r.eliminado = FALSE${dfRel.sql}
         ) AS relacionamientosTotal,
         (
           SELECT COUNT(*)
           FROM relacionamientos r
           INNER JOIN contactos co ON co.id = r.contacto_id
           INNER JOIN clientes cl ON cl.id = co.cliente_id
           WHERE cl.pais_id = ?
             AND r.eliminado = FALSE
             AND r.resultado = ?${dfRel.sql}
         ) AS reunionesProgramadas`,
      [
        paisSesionId,
        EstadoProceso.CERRADO,
        EstadoProceso.DESCARTADO,
        ...dfProc.params,
        paisSesionId,
        EstadoProceso.CERRADO,
        EstadoProceso.DESCARTADO,
        ...dfProc.params,
        paisSesionId,
        ...dfProc.params,
        paisSesionId,
        ...dfRel.params,
        paisSesionId,
        paisSesionId,
        paisSesionId,
        ...dfRel.params,
        paisSesionId,
        ResultadoRelacionamiento.REUNION_PROGRAMADA,
        ...dfRel.params,
      ],
    );

    return rows[0] ?? {};
  }

  private async queryEmbudoComercial(
    paisSesionId: number,
    proyeccionesActivas: number,
  ): Promise<AnaliticaEmbudoEtapaDto[]> {
    const estadoRows = await this.procesoRepository.query(
      `SELECT p.estado, COUNT(*) AS total
       FROM procesos p
       WHERE p.eliminado = FALSE
         AND p.pais_id = ?
         AND ${RFI_FILTER}
         AND p.estado IN (?, ?, ?, ?, ?)
       GROUP BY p.estado`,
      [
        paisSesionId,
        EstadoProceso.EN_PROCESO,
        EstadoProceso.EN_VALIDACION,
        EstadoProceso.PRESENTADO,
        EstadoProceso.SUBSANACION,
        EstadoProceso.ADJUDICADO,
      ],
    );

    const porEstado = new Map<string, number>(
      estadoRows.map((row: { estado: string; total: string }) => [
        row.estado,
        Number(row.total),
      ]),
    );

    const presentadoSubsanacion =
      (porEstado.get(EstadoProceso.PRESENTADO) ?? 0) +
      (porEstado.get(EstadoProceso.SUBSANACION) ?? 0);

    return [
      {
        etapa: 'Proyecciones activas',
        clave: 'proyecciones_activas',
        total: proyeccionesActivas,
      },
      {
        etapa: 'En proceso',
        clave: 'en_proceso',
        total: porEstado.get(EstadoProceso.EN_PROCESO) ?? 0,
      },
      {
        etapa: 'En validación',
        clave: 'en_validacion',
        total: porEstado.get(EstadoProceso.EN_VALIDACION) ?? 0,
      },
      {
        etapa: 'Presentado / Subsanación',
        clave: 'presentado_subsanacion',
        total: presentadoSubsanacion,
      },
      {
        etapa: 'Adjudicado',
        clave: 'adjudicado',
        total: porEstado.get(EstadoProceso.ADJUDICADO) ?? 0,
      },
    ];
  }

  private async queryCierresPorVentana(
    paisSesionId: number,
    desde?: string,
    hasta?: string,
  ): Promise<AnaliticaCierresVentanaDto[]> {
    const df = buildDateFilter('p.fecha_apertura', desde, hasta);
    const rows = await this.procesoRepository.query(
      `SELECT
         SUM(CASE
           WHEN DATEDIFF(p.fecha_cierre, CURDATE()) BETWEEN 0 AND 30 THEN 1
           ELSE 0 END) AS ventana0_30,
         SUM(CASE
           WHEN DATEDIFF(p.fecha_cierre, CURDATE()) BETWEEN 31 AND 60 THEN 1
           ELSE 0 END) AS ventana31_60,
         SUM(CASE
           WHEN DATEDIFF(p.fecha_cierre, CURDATE()) BETWEEN 61 AND 90 THEN 1
           ELSE 0 END) AS ventana61_90
       FROM procesos p
       WHERE p.eliminado = FALSE
         AND p.pais_id = ?
         AND ${RFI_FILTER}
         AND p.estado NOT IN (?, ?)
         AND p.fecha_cierre IS NOT NULL
         AND DATEDIFF(p.fecha_cierre, CURDATE()) BETWEEN 0 AND 90${df.sql}`,
      [paisSesionId, EstadoProceso.CERRADO, EstadoProceso.DESCARTADO, ...df.params],
    );

    const row = rows[0] ?? {};

    return [
      {
        ventana: '0_30',
        label: '0–30 días',
        total: Number(row.ventana0_30 ?? 0),
      },
      {
        ventana: '31_60',
        label: '31–60 días',
        total: Number(row.ventana31_60 ?? 0),
      },
      {
        ventana: '61_90',
        label: '61–90 días',
        total: Number(row.ventana61_90 ?? 0),
      },
    ];
  }

  private async queryProyeccionesPorEstadoMercado(
    paisSesionId: number,
    anio: number,
    desde?: string,
    hasta?: string,
  ): Promise<AnaliticaProyeccionEstadoMercadoDto[]> {
    const estadosExcluidos = [
      EstadoProyeccion.CERRADO,
      EstadoProyeccion.PUBLICADO,
    ];
    const df = buildDateFilter('fecha_estimada_publicacion', desde, hasta);

    const rows = await this.proyeccionRepository.query(
      `SELECT estado, mercado, COUNT(*) AS total
       FROM proyecciones
       WHERE eliminado = FALSE
         AND pais_id = ?
         AND anio_proyectado = ?
         AND estado NOT IN (?, ?)
         AND mercado IN (?, ?)${df.sql}
       GROUP BY estado, mercado
       ORDER BY estado ASC`,
      [
        paisSesionId,
        anio,
        ...estadosExcluidos,
        MercadoProyeccion.GENERAL,
        MercadoProyeccion.OBJETIVO,
        ...df.params,
      ],
    );

    const porEstado = new Map<string, { general: number; objetivo: number }>();

    for (const row of rows as Array<{
      estado: string;
      mercado: string;
      total: string;
    }>) {
      const current = porEstado.get(row.estado) ?? { general: 0, objetivo: 0 };
      if (row.mercado === MercadoProyeccion.GENERAL) {
        current.general = Number(row.total);
      } else if (row.mercado === MercadoProyeccion.OBJETIVO) {
        current.objetivo = Number(row.total);
      }
      porEstado.set(row.estado, current);
    }

    const ordenEstados = [
      EstadoProyeccion.LEJANO,
      EstadoProyeccion.PROXIMO,
      EstadoProyeccion.SALE_ESTE_MES,
    ];

    return ordenEstados.map((estado) => {
      const counts = porEstado.get(estado) ?? { general: 0, objetivo: 0 };
      return {
        estado,
        general: counts.general,
        objetivo: counts.objetivo,
      };
    });
  }

  private async queryCrmPorCampo(
    paisSesionId: number,
    campo: 'r.canal' | 'r.resultado',
    desde?: string,
    hasta?: string,
  ): Promise<AnaliticaConteoDto[]> {
    const df = buildDateFilter('r.fecha_mensaje', desde, hasta);
    const rows = await this.procesoRepository.query(
      `SELECT ${campo} AS etiqueta, COUNT(*) AS total
       FROM relacionamientos r
       INNER JOIN contactos co ON co.id = r.contacto_id
       INNER JOIN clientes cl ON cl.id = co.cliente_id
       WHERE cl.pais_id = ?
         AND r.eliminado = FALSE${df.sql}
       GROUP BY ${campo}
       ORDER BY total DESC`,
      [paisSesionId, ...df.params],
    );

    return (rows as Array<{ etiqueta: string | null; total: string }>).map((row) => ({
      etiqueta: row.etiqueta ?? 'Sin asignar',
      total: Number(row.total),
    }));
  }

  private async queryCrmPorSegmentoCliente(
    paisSesionId: number,
  ): Promise<AnaliticaConteoDto[]> {
    const rows = await this.procesoRepository.query(
      `SELECT cl.segmento AS etiqueta, COUNT(*) AS total
       FROM clientes cl
       WHERE cl.pais_id = ?
         AND cl.eliminado = FALSE
       GROUP BY cl.segmento
       ORDER BY total DESC`,
      [paisSesionId],
    );

    return (rows as Array<{ etiqueta: string | null; total: string }>).map((row) => ({
      etiqueta: row.etiqueta ?? 'Sin asignar',
      total: Number(row.total),
    }));
  }

  private async queryCrmEstadoRespuesta(
    paisSesionId: number,
    desde?: string,
    hasta?: string,
  ): Promise<AnaliticaConteoDto[]> {
    const df = buildDateFilter('r.fecha_mensaje', desde, hasta);
    const rows = await this.procesoRepository.query(
      `SELECT
         SUM(CASE
           WHEN r.respuesta IS NOT NULL AND TRIM(r.respuesta) <> '' THEN 1
           ELSE 0 END) AS conRespuesta,
         SUM(CASE
           WHEN (r.respuesta IS NULL OR TRIM(r.respuesta) = '')
            AND v.id IS NULL THEN 1
           ELSE 0 END) AS pendientes,
         SUM(CASE WHEN v.id IS NOT NULL THEN 1 ELSE 0 END) AS vencidos
       FROM relacionamientos r
       INNER JOIN contactos co ON co.id = r.contacto_id
       INNER JOIN clientes cl ON cl.id = co.cliente_id
       LEFT JOIN vista_relacionamientos_vencidos v ON v.id = r.id
       WHERE cl.pais_id = ?
         AND r.eliminado = FALSE${df.sql}`,
      [paisSesionId, ...df.params],
    );

    const row = rows[0] ?? {};
    return [
      { etiqueta: 'Con respuesta', total: Number(row.conRespuesta ?? 0) },
      { etiqueta: 'Pendientes', total: Number(row.pendientes ?? 0) },
      { etiqueta: 'Vencidos', total: Number(row.vencidos ?? 0) },
    ];
  }

  private async queryCrmActividad(
    paisSesionId: number,
    desde?: string,
    hasta?: string,
  ): Promise<AnaliticaCierresVentanaDto[]> {
    const df = buildDateFilter('r.fecha_mensaje', desde, hasta);
    const rows = await this.procesoRepository.query(
      `SELECT
         SUM(CASE
           WHEN DATEDIFF(CURDATE(), r.fecha_mensaje) BETWEEN 0 AND 30 THEN 1
           ELSE 0 END) AS ventana0_30,
         SUM(CASE
           WHEN DATEDIFF(CURDATE(), r.fecha_mensaje) BETWEEN 31 AND 60 THEN 1
           ELSE 0 END) AS ventana31_60,
         SUM(CASE
           WHEN DATEDIFF(CURDATE(), r.fecha_mensaje) BETWEEN 61 AND 90 THEN 1
           ELSE 0 END) AS ventana61_90
       FROM relacionamientos r
       INNER JOIN contactos co ON co.id = r.contacto_id
       INNER JOIN clientes cl ON cl.id = co.cliente_id
       WHERE cl.pais_id = ?
         AND r.eliminado = FALSE
         AND r.fecha_mensaje IS NOT NULL
         AND DATEDIFF(CURDATE(), r.fecha_mensaje) BETWEEN 0 AND 90${df.sql}`,
      [paisSesionId, ...df.params],
    );

    const row = rows[0] ?? {};
    return [
      { ventana: '0_30', label: 'Últimos 30 días', total: Number(row.ventana0_30 ?? 0) },
      { ventana: '31_60', label: '31–60 días', total: Number(row.ventana31_60 ?? 0) },
      { ventana: '61_90', label: '61–90 días', total: Number(row.ventana61_90 ?? 0) },
    ];
  }
}
