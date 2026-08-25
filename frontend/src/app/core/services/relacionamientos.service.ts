import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CanalRelacionamiento,
  CreateRelacionamientoPayload,
  Relacionamiento,
  RelacionamientoVencido,
  ResultadoRelacionamiento,
  UpdateRelacionamientoPayload,
} from '../models/crm.model';

@Injectable({ providedIn: 'root' })
export class RelacionamientosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/relacionamientos`;

  list(params: {
    page?: number;
    limit?: number;
    search?: string;
    contactoId?: number;
    clienteId?: number;
    canal?: CanalRelacionamiento;
    resultado?: ResultadoRelacionamiento;
    fechaMensajeDesde?: string;
    fechaMensajeHasta?: string;
  } = {}): Observable<{ data: Relacionamiento[]; total: number }> {
    const query: Record<string, string | number> = {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    };
    if (params.search) query['search'] = params.search;
    if (params.contactoId) query['contactoId'] = params.contactoId;
    if (params.clienteId) query['clienteId'] = params.clienteId;
    if (params.canal) query['canal'] = params.canal;
    if (params.resultado) query['resultado'] = params.resultado;
    if (params.fechaMensajeDesde) query['fechaMensajeDesde'] = params.fechaMensajeDesde;
    if (params.fechaMensajeHasta) query['fechaMensajeHasta'] = params.fechaMensajeHasta;

    return this.http.get<{ data: Relacionamiento[]; total: number }>(this.base, { params: query });
  }

  listVencidos(clienteId?: number): Observable<{ data: RelacionamientoVencido[] }> {
    const params: Record<string, string | number> = {};
    if (clienteId) params['clienteId'] = clienteId;
    return this.http.get<{ data: RelacionamientoVencido[] }>(`${this.base}/vencidos`, { params });
  }

  getById(id: number): Observable<{ relacionamiento: Relacionamiento }> {
    return this.http.get<{ relacionamiento: Relacionamiento }>(`${this.base}/${id}`);
  }

  create(payload: CreateRelacionamientoPayload): Observable<{ relacionamiento: Relacionamiento }> {
    return this.http.post<{ relacionamiento: Relacionamiento }>(this.base, payload);
  }

  update(
    id: number,
    payload: UpdateRelacionamientoPayload,
  ): Observable<{ relacionamiento: Relacionamiento }> {
    return this.http.patch<{ relacionamiento: Relacionamiento }>(`${this.base}/${id}`, payload);
  }

  eliminar(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }
}
