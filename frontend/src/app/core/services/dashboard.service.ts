import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FiltroEliminados } from '../models/filtro-eliminados.model';
import { descargarBlob, parseBlobErrorMessage } from '../utils/blob-download.util';

export interface DashboardResumen {
  totalProcesos: number;
  porEstado: Array<{ estado: string; total: number }>;
  porSegmento: Array<{ segmento: string; total: number }>;
}

export interface DashboardProceso {
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
}

export interface DashboardProyecciones {
  anio: number;
  totalProyeccionesActivas: number;
  sumaValorVenta: string;
  sumaValorFacturacion: string;
  porEstado: Array<{ estado: string; total: number; sumaVenta: string; sumaFacturacion: string }>;
  porMercado: Array<{ mercado: string | null; total: number; sumaVenta: string; sumaFacturacion: string }>;
}

export interface ReporteGenerado {
  id: number;
  tipo: string;
  periodo: string;
  paisId: number;
  nombreArchivo: string;
  tamanoBytes: number;
  generadoEn: string;
  generadoPor: string;
}

export interface AnaliticaKpis {
  procesosActivos: number;
  proyeccionesActivas: number;
  cierresProximos30Dias: number;
  validacionesPendientes: number;
  relacionamientosVencidos: number;
  clientesActivos: number;
  contactosActivos: number;
  relacionamientosTotal: number;
  reunionesProgramadas: number;
}

export interface AnaliticaConteo {
  etiqueta: string;
  total: number;
}

export interface AnaliticaEmbudoEtapa {
  etapa: string;
  clave: string;
  total: number;
}

export interface AnaliticaCierresVentana {
  ventana: string;
  label: string;
  total: number;
}

export interface AnaliticaEfectividadMercadoResumen {
  pctGanadasDeMaterializadas: number | null;
  materializadas: number;
  ganadas: number;
}

export interface AnaliticaProyeccionEstadoMercado {
  estado: string;
  general: number;
  objetivo: number;
}

export interface AnaliticaGaugesMontos {
  adjudicacion: string;
  facturacion: string;
}

export interface AnaliticaGauges {
  metaAdjudicacion: string | null;
  metaFacturacion: string | null;
  real: AnaliticaGaugesMontos;
  proyectada: AnaliticaGaugesMontos;
}

export interface AnaliticaDashboard {
  anio: number;
  kpis: AnaliticaKpis;
  resumen: DashboardResumen;
  proyecciones: DashboardProyecciones;
  gauges: AnaliticaGauges;
  embudo: AnaliticaEmbudoEtapa[];
  cierresPorVentana: AnaliticaCierresVentana[];
  proyeccionesPorEstadoMercado: AnaliticaProyeccionEstadoMercado[];
  efectividadMercado: {
    anio: number;
    general: AnaliticaEfectividadMercadoResumen;
    objetivo: AnaliticaEfectividadMercadoResumen;
  };
  crm: {
    porCanal: AnaliticaConteo[];
    porResultado: AnaliticaConteo[];
    porSegmentoCliente: AnaliticaConteo[];
    estadoRespuesta: AnaliticaConteo[];
    actividadPorVentana: AnaliticaCierresVentana[];
  };
}

export interface DashboardProcesosFilters {
  search?: string;
  estado?: string;
  segmento?: string;
  tipoProceso?: string;
  tipoInstrumento?: string;
  portalOrigen?: string;
  empresaClienteId?: number;
  fechaCierreDesde?: string;
  fechaCierreHasta?: string;
  filtroEliminados?: FiltroEliminados;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/dashboard`;

  getResumen(): Observable<{ resumen: DashboardResumen }> {
    return this.http.get<{ resumen: DashboardResumen }>(`${this.base}/resumen`);
  }

  getProcesos(filters: DashboardProcesosFilters): Observable<{ data: DashboardProceso[] }> {
    return this.http.get<{ data: DashboardProceso[] }>(`${this.base}/procesos`, {
      params: this.buildProcesosParams(filters),
    });
  }

  getProyecciones(anio?: number): Observable<{ data: DashboardProyecciones }> {
    const params: Record<string, number> = {};
    if (anio) params['anio'] = anio;
    return this.http.get<{ data: DashboardProyecciones }>(`${this.base}/proyecciones`, { params });
  }

  getAnalitica(anio?: number, desde?: string, hasta?: string): Observable<{ data: AnaliticaDashboard }> {
    const params: Record<string, string | number> = {};
    if (anio) params['anio'] = anio;
    if (desde) params['desde'] = desde;
    if (hasta) params['hasta'] = hasta;
    return this.http.get<{ data: AnaliticaDashboard }>(`${this.base}/analitica`, { params });
  }

  putMetas(payload: {
    anio: number;
    metaAdjudicacion: number;
    metaFacturacion: number;
  }): Observable<{
    message: string;
    data: { anio: number; metaAdjudicacion: string; metaFacturacion: string };
  }> {
    return this.http.put<{
      message: string;
      data: { anio: number; metaAdjudicacion: string; metaFacturacion: string };
    }>(`${this.base}/metas`, payload);
  }

  exportar(
    filters: DashboardProcesosFilters,
    anio?: number,
    onError?: (message: string) => void,
  ): void {
    let params = this.buildProcesosParams(filters);
    if (anio) {
      params = params.set('anio', anio);
    }

    this.http
      .get(`${this.base}/export`, { params, responseType: 'blob', observe: 'response' })
      .subscribe({
        next: async (response) => {
          const blob = response.body;
          if (!blob || blob.size === 0) {
            onError?.('La exportación no devolvió datos.');
            return;
          }

          const contentType = response.headers.get('Content-Type') ?? '';
          if (contentType.includes('application/json')) {
            const text = await blob.text();
            try {
              const json = JSON.parse(text) as { message?: string };
              onError?.(json.message ?? 'No fue posible exportar el dashboard.');
            } catch {
              onError?.('No fue posible exportar el dashboard.');
            }
            return;
          }

          const fecha = new Date().toISOString().slice(0, 10);
          await descargarBlob(blob, `dashboard-${fecha}.xlsx`);
        },
        error: async (err: HttpErrorResponse) => {
          const message = await parseBlobErrorMessage(
            err,
            'No fue posible exportar el dashboard.',
          );
          onError?.(message);
        },
      });
  }

  getReportes(): Observable<{ data: ReporteGenerado[] }> {
    return this.http.get<{ data: ReporteGenerado[] }>(`${this.base}/reportes`);
  }

  descargarReporte(
    id: number,
    nombreArchivo: string,
    onError?: (message: string) => void,
  ): void {
    this.http
      .get(`${this.base}/reportes/${id}/descargar`, {
        responseType: 'blob',
        observe: 'response',
      })
      .subscribe({
        next: async (response) => {
          const blob = response.body;
          if (!blob || blob.size === 0) {
            onError?.('El reporte no está disponible.');
            return;
          }
          await descargarBlob(blob, nombreArchivo);
        },
        error: async (err: HttpErrorResponse) => {
          const message = await parseBlobErrorMessage(
            err,
            'No fue posible descargar el reporte.',
          );
          onError?.(message);
        },
      });
  }

  private buildProcesosParams(filters: DashboardProcesosFilters): HttpParams {
    let params = new HttpParams();
    if (filters.search?.trim()) params = params.set('search', filters.search.trim());
    if (filters.estado) params = params.set('estado', filters.estado);
    if (filters.segmento) params = params.set('segmento', filters.segmento);
    if (filters.tipoProceso) params = params.set('tipoProceso', filters.tipoProceso);
    if (filters.tipoInstrumento) params = params.set('tipoInstrumento', filters.tipoInstrumento);
    if (filters.portalOrigen) params = params.set('portalOrigen', filters.portalOrigen);
    if (filters.empresaClienteId != null) {
      params = params.set('empresaClienteId', filters.empresaClienteId);
    }
    if (filters.fechaCierreDesde) {
      params = params.set('fechaCierreDesde', filters.fechaCierreDesde);
    }
    if (filters.fechaCierreHasta) {
      params = params.set('fechaCierreHasta', filters.fechaCierreHasta);
    }
    if (filters.filtroEliminados) {
      params = params.set('filtroEliminados', filters.filtroEliminados);
    }
    return params;
  }
}
