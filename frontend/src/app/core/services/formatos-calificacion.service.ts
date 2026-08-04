import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EvaluarCalificacionesPayload,
  FormatoCalificacionDetail,
  FormatoCalificacionListItem,
  ProcesoCalificacion,
} from '../models/formato-calificacion.model';

@Injectable({ providedIn: 'root' })
export class FormatosCalificacionService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/formatos-calificacion`;

  list(soloActivos = false): Observable<{ data: FormatoCalificacionListItem[] }> {
    let params = new HttpParams();
    if (soloActivos) {
      params = params.set('soloActivos', 'true');
    }
    return this.http.get<{ data: FormatoCalificacionListItem[] }>(this.base, { params });
  }

  getById(id: number): Observable<{ data: FormatoCalificacionDetail }> {
    return this.http.get<{ data: FormatoCalificacionDetail }>(`${this.base}/${id}`);
  }

  importFormato(
    nombre: string,
    puntajeMinimo: number,
    file: File,
  ): Observable<{ data: FormatoCalificacionDetail; message: string }> {
    const form = new FormData();
    form.append('nombre', nombre);
    form.append('puntajeMinimo', String(puntajeMinimo));
    form.append('file', file);
    return this.http.post<{ data: FormatoCalificacionDetail; message: string }>(
      `${this.base}/import`,
      form,
    );
  }

  activar(id: number): Observable<{ data: FormatoCalificacionListItem; message: string }> {
    return this.http.patch<{ data: FormatoCalificacionListItem; message: string }>(
      `${this.base}/${id}/activar`,
      {},
    );
  }

  desactivar(id: number): Observable<{ data: FormatoCalificacionListItem; message: string }> {
    return this.http.patch<{ data: FormatoCalificacionListItem; message: string }>(
      `${this.base}/${id}/desactivar`,
      {},
    );
  }

  getCalificacionesProceso(procesoId: number): Observable<{ data: ProcesoCalificacion[] }> {
    return this.http.get<{ data: ProcesoCalificacion[] }>(
      `${environment.apiUrl}/procesos/${procesoId}/calificaciones`,
    );
  }

  evaluarProceso(
    procesoId: number,
    payload: EvaluarCalificacionesPayload,
  ): Observable<{ data: ProcesoCalificacion[]; message: string }> {
    return this.http.post<{ data: ProcesoCalificacion[]; message: string }>(
      `${environment.apiUrl}/procesos/${procesoId}/calificaciones/evaluar`,
      payload,
    );
  }
}
