import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Notificacion {
  id: number;
  tipo: string;
  mensaje: string;
  entidadTipo: string | null;
  entidadId: number | null;
  leida: boolean;
  fechaCreacion: string;
}

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/notificaciones`;

  list(soloNoLeidas = false): Observable<{ data: Notificacion[] }> {
    return this.http.get<{ data: Notificacion[] }>(this.base, {
      params: soloNoLeidas ? { soloNoLeidas: 'true' } : {},
    });
  }

  marcarLeida(id: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/${id}/leer`, {});
  }

  marcarTodasLeidas(): Observable<{ message: string; total: number }> {
    return this.http.patch<{ message: string; total: number }>(`${this.base}/leer-todas`, {});
  }
}
