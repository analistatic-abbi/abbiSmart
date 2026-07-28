import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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
}
