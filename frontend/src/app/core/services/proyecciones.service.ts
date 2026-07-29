import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateProyeccionPayload,
  EfectividadMercadoReporte,
  EstadoProyeccion,
  Proyeccion,
} from '../models/admin.model';

@Injectable({ providedIn: 'root' })
export class ProyeccionesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/proyecciones`;

  list(params: {
    page?: number;
    limit?: number;
    search?: string;
    estado?: EstadoProyeccion;
    anioProyectado?: number;
    mercado?: string;
    procesoOrigenId?: number;
  } = {}): Observable<{ data: Proyeccion[]; total: number }> {
    const query: Record<string, string | number> = {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    };
    if (params.search) query['search'] = params.search;
    if (params.estado) query['estado'] = params.estado;
    if (params.anioProyectado) query['anioProyectado'] = params.anioProyectado;
    if (params.mercado) query['mercado'] = params.mercado;
    if (params.procesoOrigenId) query['procesoOrigenId'] = params.procesoOrigenId;

    return this.http.get<{ data: Proyeccion[]; total: number }>(this.base, { params: query });
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
