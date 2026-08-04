import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { EstadoProyeccion } from '../../common/enums/estado-proyeccion.enum';
import { EstadoUsuario } from '../../common/enums/estado-usuario.enum';
import { Rol } from '../../common/enums/rol.enum';
import {
  buildWorkbookBuffer,
  type SpreadsheetSheet,
} from '../../common/utils/spreadsheet-writer';
import { Pais } from '../../database/entities/pais.entity';
import { Proceso } from '../../database/entities/proceso.entity';
import { Proyeccion } from '../../database/entities/proyeccion.entity';
import { ReporteGenerado } from '../../database/entities/reporte-generado.entity';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { DashboardExportQueryDto, DashboardProcesosQueryDto } from './dto/dashboard-query.dto';

export const EXPORT_MAX_ROWS = 10_000;

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
    private readonly notificacionesService: NotificacionesService,
  ) {}

  async getResumen(paisSesionId: number): Promise<DashboardResumenDto> {
    const totalRows = await this.procesoRepository.query(
      `SELECT COUNT(*) AS total
       FROM procesos p
       WHERE p.eliminado = FALSE AND p.pais_id = ? AND ${RFI_FILTER}`,
      [paisSesionId],
    );

    const porEstado = await this.procesoRepository.query(
      `SELECT p.estado, COUNT(*) AS total
       FROM procesos p
       WHERE p.eliminado = FALSE AND p.pais_id = ? AND ${RFI_FILTER}
       GROUP BY p.estado
       ORDER BY p.estado ASC`,
      [paisSesionId],
    );

    const porSegmento = await this.procesoRepository.query(
      `SELECT p.segmento, COUNT(*) AS total
       FROM procesos p
       WHERE p.eliminado = FALSE AND p.pais_id = ? AND ${RFI_FILTER}
       GROUP BY p.segmento
       ORDER BY p.segmento ASC`,
      [paisSesionId],
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
  ): Promise<DashboardProcesoDto[]> {
    const term = query.search?.trim();
    if (!term) {
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

    const pattern = `%${term}%`;
    const dateConditions: string[] = [];
    const dateParams: unknown[] = [];

    if (query.fechaCierreDesde) {
      dateConditions.push('p.fecha_cierre >= ?');
      dateParams.push(query.fechaCierreDesde);
    }

    if (query.fechaCierreHasta) {
      dateConditions.push('p.fecha_cierre <= ?');
      dateParams.push(query.fechaCierreHasta);
    }

    const dateClause = dateConditions.length
      ? ` AND ${dateConditions.join(' AND ')}`
      : '';

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
       WHERE p.pais_id = ?
         AND p.eliminado = FALSE
         AND ${RFI_FILTER}
         AND p.estado NOT IN ('Cerrado', 'Descartado')
         AND p.id_digitado LIKE ?${dateClause}
       ORDER BY vc.dias_restantes_cierre ASC`,
      [paisSesionId, pattern, ...dateParams],
    );

    return rows as DashboardProcesoDto[];
  }

  async getProyecciones(
    paisSesionId: number,
    anio?: number,
  ): Promise<DashboardProyeccionesDto> {
    const anioFiltro = anio ?? new Date().getFullYear();
    const estadosExcluidos = [
      EstadoProyeccion.CERRADO,
      EstadoProyeccion.PUBLICADO,
    ];

    const totalRows = await this.proyeccionRepository.query(
      `SELECT
         COUNT(*) AS total,
         COALESCE(SUM(valor_venta), 0) AS sumaVenta,
         COALESCE(SUM(valor_facturacion), 0) AS sumaFacturacion
       FROM proyecciones
       WHERE eliminado = FALSE
         AND pais_id = ?
         AND anio_proyectado = ?
         AND estado NOT IN (?, ?)`,
      [paisSesionId, anioFiltro, ...estadosExcluidos],
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
         AND estado NOT IN (?, ?)
       GROUP BY estado
       ORDER BY estado ASC`,
      [paisSesionId, anioFiltro, ...estadosExcluidos],
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
         AND estado NOT IN (?, ?)
       GROUP BY mercado
       ORDER BY mercado ASC`,
      [paisSesionId, anioFiltro, ...estadosExcluidos],
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

  async exportarXlsx(
    paisSesionId: number,
    query: DashboardExportQueryDto = {},
  ): Promise<{ buffer: Buffer; filename: string }> {
    const resumen = await this.getResumen(paisSesionId);
    const procesos = await this.getProcesosParaExport(paisSesionId, query);
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
  ): Promise<DashboardProcesoDto[]> {
    const term = query.search?.trim();
    const params: unknown[] = [paisSesionId];
    let filtroBusqueda = '';

    if (term) {
      const pattern = `%${term}%`;
      filtroBusqueda = ' AND p.id_digitado LIKE ?';
      params.push(pattern);
    }

    if (query.fechaCierreDesde) {
      filtroBusqueda += ' AND p.fecha_cierre >= ?';
      params.push(query.fechaCierreDesde);
    }

    if (query.fechaCierreHasta) {
      filtroBusqueda += ' AND p.fecha_cierre <= ?';
      params.push(query.fechaCierreHasta);
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
       WHERE p.pais_id = ?
         AND p.eliminado = FALSE
         AND ${RFI_FILTER}
         AND p.estado NOT IN ('Cerrado', 'Descartado')
         ${filtroBusqueda}
       ORDER BY vc.dias_restantes_cierre ASC
       LIMIT ${EXPORT_MAX_ROWS}`,
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
}
