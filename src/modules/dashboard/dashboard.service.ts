import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EstadoProyeccion } from '../../common/enums/estado-proyeccion.enum';
import { Proceso } from '../../database/entities/proceso.entity';
import { Proyeccion } from '../../database/entities/proyeccion.entity';

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

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Proceso)
    private readonly procesoRepository: Repository<Proceso>,
    @InjectRepository(Proyeccion)
    private readonly proyeccionRepository: Repository<Proyeccion>,
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

  async getProcesos(paisSesionId: number): Promise<DashboardProcesoDto[]> {
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
       WHERE p.pais_id = ? AND ${RFI_FILTER}
         AND p.estado NOT IN ('Cerrado', 'Descartado')
       ORDER BY vc.dias_restantes_cierre ASC`,
      [paisSesionId],
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
}
