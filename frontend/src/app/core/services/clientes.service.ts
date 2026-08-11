import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cliente, ClienteVista360, CreateClientePayload } from '../models/crm.model';
import { FiltroEliminados } from '../models/filtro-eliminados.model';

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/clientes`;

  list(params: {
    page?: number;
    limit?: number;
    search?: string;
    segmento?: string;
    filtroEliminados?: FiltroEliminados;
    incluirEliminados?: boolean;
  } = {}): Observable<{ data: Cliente[]; total: number }> {
    const query: Record<string, string | number> = {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    };
    if (params.search) query['search'] = params.search;
    if (params.segmento) query['segmento'] = params.segmento;
    if (params.filtroEliminados && params.filtroEliminados !== 'activos') {
      query['filtroEliminados'] = params.filtroEliminados;
    } else if (params.incluirEliminados) {
      query['filtroEliminados'] = 'todos';
    }

    return this.http.get<{ data: Cliente[]; total: number }>(this.base, { params: query });
  }

  getById(id: number): Observable<{ cliente: Cliente }> {
    return this.http.get<{ cliente: Cliente }>(`${this.base}/${id}`);
  }

  create(payload: CreateClientePayload): Observable<{ cliente: Cliente }> {
    return this.http.post<{ cliente: Cliente }>(this.base, payload);
  }

  update(id: number, payload: Partial<CreateClientePayload>): Observable<{ cliente: Cliente }> {
    return this.http.patch<{ cliente: Cliente }>(`${this.base}/${id}`, payload);
  }

  buscarSimilares(
    q: string,
    limit = 5,
  ): Observable<{
    data: Array<{ id: number; nombre: string; similitud: number }>;
  }> {
    return this.http.get<{
      data: Array<{ id: number; nombre: string; similitud: number }>;
    }>(`${this.base}/similares`, { params: { q, limit } });
  }

  getHistorial(
    id: number,
    page = 1,
    limit = 50,
  ): Observable<{
    data: Array<{
      tipo: 'proceso' | 'relacionamiento';
      entidadId: number;
      fecha: string;
      titulo: string;
      subtitulo?: string | null;
      estado?: string | null;
      contactoNombre?: string | null;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    return this.http.get<{
      data: Array<{
        tipo: 'proceso' | 'relacionamiento';
        entidadId: number;
        fecha: string;
        titulo: string;
        subtitulo?: string | null;
        estado?: string | null;
        contactoNombre?: string | null;
      }>;
      total: number;
      page: number;
      limit: number;
    }>(`${this.base}/${id}/historial`, { params: { page, limit } });
  }

  getVista360(id: number): Observable<{
    data: ClienteVista360;
  }> {
    return this.http.get<{ data: ClienteVista360 }>(`${this.base}/${id}/vista-360`);
  }

  getDependencias(id: number): Observable<{
    data: {
      tieneDependientes: boolean;
      dependientes: Array<{ tipo: string; id: number; descripcion: string }>;
    };
  }> {
    return this.http.get<{
      data: {
        tieneDependientes: boolean;
        dependientes: Array<{ tipo: string; id: number; descripcion: string }>;
      };
    }>(`${this.base}/${id}/dependencias`);
  }

  eliminar(id: number, confirmarDependientes = false): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`, {
      params: confirmarDependientes ? { confirmarDependientes: 'true' } : {},
    });
  }

  reasignarProcesos(id: number, nuevoClienteId: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/${id}/reasignar-procesos`, {
      nuevoClienteId,
    });
  }
}
