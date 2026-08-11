import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  FormatoEncuestaDetail,
  FormatoEncuestaListItem,
  FormatoEncuestaPreguntaPlanaInput,
  FormatoEncuestaSeccionInput,
} from '../models/formato-encuesta.model';

@Injectable({ providedIn: 'root' })
export class FormatosEncuestaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/formatos-encuesta`;

  list(soloActivos = false): Observable<{ data: FormatoEncuestaListItem[] }> {
    let params = new HttpParams();
    if (soloActivos) {
      params = params.set('soloActivos', 'true');
    }
    return this.http.get<{ data: FormatoEncuestaListItem[] }>(this.base, { params });
  }

  getById(id: number): Observable<{ data: FormatoEncuestaDetail }> {
    return this.http.get<{ data: FormatoEncuestaDetail }>(`${this.base}/${id}`);
  }

  create(
    nombre: string,
    secciones?: FormatoEncuestaSeccionInput[],
  ): Observable<{ data: FormatoEncuestaDetail; message: string }> {
    const body: { nombre: string; secciones?: FormatoEncuestaSeccionInput[] } = { nombre };
    if (secciones?.length) {
      body.secciones = secciones;
    }
    return this.http.post<{ data: FormatoEncuestaDetail; message: string }>(this.base, body);
  }

  importFormato(
    nombre: string,
    file: File,
  ): Observable<{ data: FormatoEncuestaDetail; message: string }> {
    const form = new FormData();
    form.append('nombre', nombre);
    form.append('file', file);
    return this.http.post<{ data: FormatoEncuestaDetail; message: string }>(
      `${this.base}/import`,
      form,
    );
  }

  clonar(
    id: number,
    nombre: string,
    secciones?: FormatoEncuestaSeccionInput[],
  ): Observable<{ data: FormatoEncuestaDetail; message: string }> {
    const body: { nombre: string; secciones?: FormatoEncuestaSeccionInput[] } = { nombre };
    if (secciones?.length) {
      body.secciones = secciones;
    }
    return this.http.post<{ data: FormatoEncuestaDetail; message: string }>(
      `${this.base}/${id}/clonar`,
      body,
    );
  }

  update(
    id: number,
    payload: { nombre?: string; activo?: boolean },
  ): Observable<{ data: FormatoEncuestaDetail; message: string }> {
    return this.http.patch<{ data: FormatoEncuestaDetail; message: string }>(
      `${this.base}/${id}`,
      payload,
    );
  }

  updateEstructura(
    id: number,
    secciones: FormatoEncuestaSeccionInput[],
  ): Observable<{ data: FormatoEncuestaDetail; message: string }> {
    return this.http.patch<{ data: FormatoEncuestaDetail; message: string }>(
      `${this.base}/${id}/estructura`,
      { secciones },
    );
  }

  /** @deprecated Prefer updateEstructura */
  updatePreguntas(
    id: number,
    preguntas: FormatoEncuestaPreguntaPlanaInput[],
  ): Observable<{ data: FormatoEncuestaDetail; message: string }> {
    return this.http.patch<{ data: FormatoEncuestaDetail; message: string }>(
      `${this.base}/${id}/preguntas`,
      { preguntas },
    );
  }
}
