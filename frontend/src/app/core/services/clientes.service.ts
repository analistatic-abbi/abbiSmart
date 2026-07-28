import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cliente, CreateClientePayload, SegmentoCliente } from '../models/crm.model';

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/clientes`;

  list(params: {
    page?: number;
    limit?: number;
    search?: string;
    segmento?: SegmentoCliente;
    incluirEliminados?: boolean;
  } = {}): Observable<{ data: Cliente[]; total: number }> {
    const query: Record<string, string | number> = {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    };
    if (params.search) query['search'] = params.search;
    if (params.segmento) query['segmento'] = params.segmento;
    if (params.incluirEliminados) query['incluirEliminados'] = 'true';

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
