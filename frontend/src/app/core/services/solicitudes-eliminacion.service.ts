import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SolicitudEliminacion } from '../models/admin.model';

@Injectable({ providedIn: 'root' })
export class SolicitudesEliminacionService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/solicitudes-eliminacion`;

  listPendientes(): Observable<{ data: SolicitudEliminacion[] }> {
    return this.http.get<{ data: SolicitudEliminacion[] }>(this.base);
  }

  solicitar(entidadTipo: string, entidadId: number, motivo: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.base, {
      entidadTipo,
      entidadId,
      motivo,
    });
  }

  aprobar(id: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/${id}/aprobar`, {});
  }

  rechazar(id: number, comentario?: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/${id}/rechazar`, {
      comentario: comentario ?? 'Rechazada por el administrador',
    });
  }
}