import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuditLog } from '../models/admin.model';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/audit`;

  list(params: {
    page?: number;
    limit?: number;
    usuarioId?: number;
    entidadTipo?: string;
    accion?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  } = {}): Observable<{ data: AuditLog[]; total: number }> {
    const query: Record<string, string | number> = {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    };
    if (params.usuarioId) query['usuarioId'] = params.usuarioId;
    if (params.entidadTipo) query['entidadTipo'] = params.entidadTipo;
    if (params.accion) query['accion'] = params.accion;
    if (params.fechaDesde) query['fechaDesde'] = params.fechaDesde;
    if (params.fechaHasta) query['fechaHasta'] = params.fechaHasta;

    return this.http.get<{ data: AuditLog[]; total: number }>(this.base, { params: query });
  }
}
