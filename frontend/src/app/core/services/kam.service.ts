import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CrearEncuestaPayload,
  GuardarRespuestasPayload,
  KamCalendarioEvento,
  KamDetail,
  KamEncuesta,
  KamListItem,
  KamListQuery,
  KamRonda,
  UpdateVeredictoPayload,
} from '../models/kam.model';

@Injectable({ providedIn: 'root' })
export class KamService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/kam`;

  list(query: KamListQuery = {}): Observable<{
    data: KamListItem[];
    total: number;
    page: number;
    limit: number;
    message: string;
  }> {
    let params = new HttpParams();
    if (query.search) params = params.set('search', query.search);
    if (query.estadoRonda) params = params.set('estadoRonda', query.estadoRonda);
    if (query.sinReunionAgendada) params = params.set('sinReunionAgendada', 'true');
    if (query.page) params = params.set('page', String(query.page));
    if (query.limit) params = params.set('limit', String(query.limit));

    return this.http.get<{
      data: KamListItem[];
      total: number;
      page: number;
      limit: number;
      message: string;
    }>(this.base, { params });
  }

  getById(id: number): Observable<{ data: KamDetail; message: string }> {
    return this.http.get<{ data: KamDetail; message: string }>(`${this.base}/${id}`);
  }

  getByProcesoId(procesoId: number): Observable<{ data: KamDetail | null; message: string }> {
    return this.http.get<{ data: KamDetail | null; message: string }>(
      `${this.base}/por-proceso/${procesoId}`,
    );
  }

  getCalendario(anio: number): Observable<{ data: KamCalendarioEvento[]; message: string }> {
    const params = new HttpParams().set('anio', String(anio));
    return this.http.get<{ data: KamCalendarioEvento[]; message: string }>(
      `${this.base}/calendario`,
      { params },
    );
  }

  crearRonda(kamId: number): Observable<{ data: KamRonda; message: string }> {
    return this.http.post<{ data: KamRonda; message: string }>(
      `${this.base}/${kamId}/rondas`,
      {},
    );
  }

  agregarBitacora(
    kamId: number,
    rondaId: number,
    texto: string,
  ): Observable<{ data: KamRonda; message: string }> {
    return this.http.post<{ data: KamRonda; message: string }>(
      `${this.base}/${kamId}/rondas/${rondaId}/bitacora`,
      { texto },
    );
  }

  /** @deprecated usar agregarBitacora */
  updateBitacora(
    kamId: number,
    rondaId: number,
    bitacora: string,
  ): Observable<{ data: KamRonda; message: string }> {
    return this.agregarBitacora(kamId, rondaId, bitacora);
  }

  subirCorrespondencia(
    kamId: number,
    rondaId: number,
    archivos: File[],
  ): Observable<{ data: KamRonda; message: string }> {
    const form = new FormData();
    for (const archivo of archivos) {
      form.append('archivos', archivo);
    }
    return this.http.post<{ data: KamRonda; message: string }>(
      `${this.base}/${kamId}/rondas/${rondaId}/correspondencia`,
      form,
    );
  }

  descargarCorrespondencia(
    kamId: number,
    rondaId: number,
    nombre: string,
    archivoId?: number,
  ): void {
    const url =
      archivoId != null
        ? `${this.base}/${kamId}/rondas/${rondaId}/correspondencia/${archivoId}`
        : `${this.base}/${kamId}/rondas/${rondaId}/correspondencia`;
    this.http
      .get(url, {
        responseType: 'blob',
        observe: 'response',
      })
      .subscribe({
        next: (res) => {
          const blob = res.body;
          if (!blob) return;
          const objectUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = objectUrl;
          a.download = nombre;
          a.click();
          URL.revokeObjectURL(objectUrl);
        },
      });
  }

  eliminarCorrespondencia(
    kamId: number,
    rondaId: number,
    archivoId?: number,
  ): Observable<{ data: KamRonda; message: string }> {
    const url =
      archivoId != null
        ? `${this.base}/${kamId}/rondas/${rondaId}/correspondencia/${archivoId}`
        : `${this.base}/${kamId}/rondas/${rondaId}/correspondencia`;
    return this.http.delete<{ data: KamRonda; message: string }>(url);
  }

  crearEncuesta(
    kamId: number,
    rondaId: number,
    payload: CrearEncuestaPayload,
  ): Observable<{ data: KamDetail['rondas'][number]['encuestas'][number]; message: string }> {
    return this.http.post<{ data: KamDetail['rondas'][number]['encuestas'][number]; message: string }>(
      `${this.base}/${kamId}/rondas/${rondaId}/encuestas`,
      payload,
    );
  }

  guardarRespuestas(
    kamId: number,
    rondaId: number,
    encuestaId: number,
    payload: GuardarRespuestasPayload,
  ): Observable<{ data: KamEncuesta; message: string }> {
    return this.http.put<{ data: KamEncuesta; message: string }>(
      `${this.base}/${kamId}/rondas/${rondaId}/encuestas/${encuestaId}/respuestas`,
      payload,
    );
  }

  updateVeredictoEncuesta(
    kamId: number,
    rondaId: number,
    encuestaId: number,
    payload: UpdateVeredictoPayload,
  ): Observable<{ data: KamEncuesta; message: string }> {
    return this.http.patch<{ data: KamEncuesta; message: string }>(
      `${this.base}/${kamId}/rondas/${rondaId}/encuestas/${encuestaId}/veredicto`,
      payload,
    );
  }

  updateVeredictoRonda(
    kamId: number,
    rondaId: number,
    payload: UpdateVeredictoPayload,
  ): Observable<{ data: KamRonda; message: string }> {
    return this.http.patch<{ data: KamRonda; message: string }>(
      `${this.base}/${kamId}/rondas/${rondaId}/veredicto`,
      payload,
    );
  }

  ejecutarRonda(kamId: number, rondaId: number): Observable<{ data: KamRonda; message: string }> {
    return this.http.post<{ data: KamRonda; message: string }>(
      `${this.base}/${kamId}/rondas/${rondaId}/ejecutar`,
      {},
    );
  }

  agendarReunion(
    kamId: number,
    rondaId: number,
    fechaReunionSocializacion: string,
  ): Observable<{ data: KamRonda; message: string }> {
    return this.http.patch<{ data: KamRonda; message: string }>(
      `${this.base}/${kamId}/rondas/${rondaId}/reunion`,
      { fechaReunionSocializacion },
    );
  }

  socializarRonda(kamId: number, rondaId: number): Observable<{ data: KamRonda; message: string }> {
    return this.http.patch<{ data: KamRonda; message: string }>(
      `${this.base}/${kamId}/rondas/${rondaId}/socializar`,
      {},
    );
  }
}
