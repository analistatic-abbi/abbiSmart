import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateUsuarioPayload, Usuario } from '../models/admin.model';
import { Rol } from '../models/rol.enum';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/users`;

  list(params: {
    page?: number;
    limit?: number;
    search?: string;
    rol?: Rol;
    paisId?: number;
  } = {}): Observable<{ data: Usuario[]; total: number }> {
    const query: Record<string, string | number> = {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    };
    if (params.search) query['search'] = params.search;
    if (params.rol) query['rol'] = params.rol;
    if (params.paisId) query['paisId'] = params.paisId;

    return this.http.get<{ data: Usuario[]; total: number }>(this.base, { params: query });
  }

  create(payload: CreateUsuarioPayload): Observable<{ usuario: Usuario }> {
    return this.http.post<{ usuario: Usuario }>(this.base, payload);
  }

  update(id: number, payload: Partial<CreateUsuarioPayload>): Observable<{ usuario: Usuario }> {
    return this.http.patch<{ usuario: Usuario }>(`${this.base}/${id}`, payload);
  }

  desactivar(id: number): Observable<{ usuario: Usuario }> {
    return this.http.patch<{ usuario: Usuario }>(`${this.base}/${id}/desactivar`, {});
  }

  resetPassword(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${id}/reset-password`, {});
  }

  reenviarActivacion(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${id}/reenviar-activacion`, {});
  }

  desbloquear(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${id}/unlock`, {});
  }
}
