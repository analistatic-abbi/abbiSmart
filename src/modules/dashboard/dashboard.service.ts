import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proceso } from '../../database/entities/proceso.entity';

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
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Proceso)
    private readonly procesoRepository: Repository<Proceso>,
  ) {}

  async getResumen(paisSesionId: number): Promise<DashboardResumenDto> {
    const totalRows = await this.procesoRepository.query(
      `SELECT COUNT(*) AS total
       FROM procesos
       WHERE eliminado = FALSE AND pais_id = ?`,
      [paisSesionId],
    );

    const porEstado = await this.procesoRepository.query(
      `SELECT estado, COUNT(*) AS total
       FROM procesos
       WHERE eliminado = FALSE AND pais_id = ?
       GROUP BY estado
       ORDER BY estado ASC`,
      [paisSesionId],
    );

    const porSegmento = await this.procesoRepository.query(
      `SELECT segmento, COUNT(*) AS total
       FROM procesos
       WHERE eliminado = FALSE AND pais_id = ?
       GROUP BY segmento
       ORDER BY segmento ASC`,
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
         vc.facturacion_estimada_anio_reporte AS facturacionEstimadaAnioReporte
       FROM vista_procesos_calculado vc
       INNER JOIN procesos p ON p.id = vc.id
       LEFT JOIN vista_procesos_avance va ON va.proceso_id = vc.id
       WHERE p.pais_id = ?
       ORDER BY vc.dias_restantes_cierre ASC`,
      [paisSesionId],
    );

    return rows as DashboardProcesoDto[];
  }
}
