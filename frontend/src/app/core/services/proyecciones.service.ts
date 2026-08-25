import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateProyeccionPayload,
  EfectividadMercadoReporte,
  EstadoProyeccion,
  Proyeccion,
} from '../models/admin.model';
import { FiltroEliminados } from '../models/filtro-eliminados.model';
import { descargarBlob, parseBlobErrorMessage } from '../utils/blob-download.util';

@Injectable({ providedIn: 'root' })
export class ProyeccionesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/proyecciones`;

  list(params: {
    page?: number;
    limit?: number;
    search?: string;
    empresaClienteId?: number;
    estado?: EstadoProyeccion;
    anioProyectado?: number;
    mercado?: string;
    procesoOrigenId?: number;
    filtroEliminados?: FiltroEliminados;
    incluirEliminados?: boolean;
  } = {}): Observable<{ data: Proyeccion[]; total: number }> {
    const query: Record<string, string | number> = {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    };
    if (params.search) query['search'] = params.search;
    if (params.empresaClienteId) query['empresaClienteId'] = params.empresaClienteId;
    if (params.estado) query['estado'] = params.estado;
    if (params.anioProyectado) query['anioProyectado'] = params.anioProyectado;
    if (params.mercado) query['mercado'] = params.mercado;
    if (params.procesoOrigenId) query['procesoOrigenId'] = params.procesoOrigenId;
    if (params.filtroEliminados && params.filtroEliminados !== 'activos') {
      query['filtroEliminados'] = params.filtroEliminados;
    } else if (params.incluirEliminados) {
      query['filtroEliminados'] = 'todos';
    }

    return this.http.get<{ data: Proyeccion[]; total: number }>(this.base, { params: query });
  }

  exportar(params: {
    search?: string;
    empresaClienteId?: number;
    estado?: EstadoProyeccion;
    anioProyectado?: number;
    mercado?: string;
    filtroEliminados?: FiltroEliminados;
  } = {}, onError?: (message: string) => void): void {
    const query: Record<string, string> = {};
    if (params.search?.trim()) query['search'] = params.search.trim();
    if (params.empresaClienteId) query['empresaClienteId'] = String(params.empresaClienteId);
    if (params.estado) query['estado'] = params.estado;
    if (params.anioProyectado) query['anioProyectado'] = String(params.anioProyectado);
    if (params.mercado) query['mercado'] = params.mercado;
    if (params.filtroEliminados && params.filtroEliminados !== 'activos') {
      query['filtroEliminados'] = params.filtroEliminados;
    }

    this.http
      .get(`${this.base}/export`, { params: query, responseType: 'blob', observe: 'response' })
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
              onError?.(json.message ?? 'No fue posible exportar las proyecciones.');
            } catch {
              onError?.('No fue posible exportar las proyecciones.');
            }
            return;
          }

          const fecha = new Date().toISOString().slice(0, 10);
          await descargarBlob(blob, `proyecciones-${fecha}.xlsx`);
        },
        error: async (err: HttpErrorResponse) => {
          const message = await parseBlobErrorMessage(
            err,
            'No fue posible exportar las proyecciones.',
          );
          onError?.(message);
        },
      });
  }

  getById(id: number): Observable<{ proyeccion: Proyeccion }> {
    return this.http.get<{ proyeccion: Proyeccion }>(`${this.base}/${id}`);
  }

  create(payload: CreateProyeccionPayload): Observable<{ proyeccion: Proyeccion }> {
    return this.http.post<{ proyeccion: Proyeccion }>(this.base, payload);
  }

  update(id: number, payload: Partial<CreateProyeccionPayload>): Observable<{ proyeccion: Proyeccion }> {
    return this.http.patch<{ proyeccion: Proyeccion }>(`${this.base}/${id}`, payload);
  }

  cerrar(id: number): Observable<{ proyeccion: Proyeccion }> {
    return this.http.patch<{ proyeccion: Proyeccion }>(`${this.base}/${id}/cerrar`, {});
  }

  vincularProceso(id: number, procesoResultanteId: number): Observable<{ proyeccion: Proyeccion }> {
    return this.http.patch<{ proyeccion: Proyeccion }>(`${this.base}/${id}/vincular-proceso`, {
      procesoResultanteId,
    });
  }

  eliminar(id: number, confirmarDependientes = false): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`, {
      params: confirmarDependientes ? { confirmarDependientes: 'true' } : {},
    });
  }

  asignarMercado(
    anioProyectado: number,
    asignaciones: Array<{ proyeccionId: number; mercado: string }>,
  ): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/asignar-mercado`, {
      anioProyectado,
      asignaciones,
    });
  }

  getEfectividadMercado(anio: number): Observable<{ data: EfectividadMercadoReporte }> {
    return this.http.get<{ data: EfectividadMercadoReporte }>(
      `${this.base}/efectividad-mercado`,
      { params: { anio } },
    );
  }
}
