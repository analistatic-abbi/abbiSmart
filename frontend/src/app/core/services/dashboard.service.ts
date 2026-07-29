import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
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

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/dashboard`;

  getResumen(): Observable<{ resumen: DashboardResumen }> {
    return this.http.get<{ resumen: DashboardResumen }>(`${this.base}/resumen`);
  }

  getProcesos(search: string): Observable<{ data: DashboardProceso[] }> {
    const term = search.trim();
    const params = new HttpParams().set('search', term);
    return this.http.get<{ data: DashboardProceso[] }>(`${this.base}/procesos`, { params });
  }

  getProyecciones(anio?: number): Observable<{ data: DashboardProyecciones }> {
    const params: Record<string, number> = {};
    if (anio) params['anio'] = anio;
    return this.http.get<{ data: DashboardProyecciones }>(`${this.base}/proyecciones`, { params });
  }

  exportar(
    search?: string,
    anio?: number,
    onError?: (message: string) => void,
  ): void {
    let params = new HttpParams();
    if (search?.trim()) {
      params = params.set('search', search.trim());
    }
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
}
