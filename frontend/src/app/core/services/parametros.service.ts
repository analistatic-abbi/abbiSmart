import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IndicadorCodigo } from '../models/proceso.model';

export interface ParametroFinanciero {
  id: number;
  indicadorCodigo: IndicadorCodigo;
  anio: number;
  valor: string;
  reglaCumplimiento: string;
  fechaModificacion: string;
}

export interface ParametroPorAnioItem {
  indicadorCodigo: IndicadorCodigo;
  valor: number;
  reglaCumplimiento: string;
}

export interface ParametroPorAnioResponseItem {
  indicadorCodigo: IndicadorCodigo;
  id: number | null;
  valor: string | null;
  reglaCumplimiento: string | null;
  fechaModificacion: string | null;
}

export interface ParametrosPropagacion {
  indicadoresActualizados: number;
  calificacionesActualizadas: number;
  calificacionesOmitidas: number;
}

export interface ParametrosPorAnioResponse {
  anio: number;
  indicadores: ParametroPorAnioResponseItem[];
  propagacion?: ParametrosPropagacion;
}

@Injectable({ providedIn: 'root' })
export class ParametrosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/parametros`;

  list(params: {
    page?: number;
    limit?: number;
    search?: string;
    indicadorCodigo?: IndicadorCodigo;
    anio?: number;
  } = {}): Observable<{ data: ParametroFinanciero[]; total: number }> {
    const query: Record<string, string | number> = {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    };
    if (params.search) query['search'] = params.search;
    if (params.indicadorCodigo) query['indicadorCodigo'] = params.indicadorCodigo;
    if (params.anio) query['anio'] = params.anio;

    return this.http.get<{ data: ParametroFinanciero[]; total: number }>(this.base, { params: query });
  }

  getPorAnio(anio: number): Observable<{ data: ParametrosPorAnioResponse }> {
    return this.http.get<{ data: ParametrosPorAnioResponse }>(`${this.base}/por-anio/${anio}`);
  }

  upsertPorAnio(
    anio: number,
    indicadores: ParametroPorAnioItem[],
  ): Observable<{ data: ParametrosPorAnioResponse }> {
    return this.http.put<{ data: ParametrosPorAnioResponse }>(`${this.base}/por-anio/${anio}`, {
      indicadores,
    });
  }

  create(payload: {
    indicadorCodigo: IndicadorCodigo;
    anio: number;
    valor: number;
    reglaCumplimiento: string;
  }): Observable<{ parametro: ParametroFinanciero }> {
    return this.http.post<{ parametro: ParametroFinanciero }>(this.base, payload);
  }

  update(
    id: number,
    payload: { valor?: number; reglaCumplimiento?: string },
  ): Observable<{ parametro: ParametroFinanciero }> {
    return this.http.patch<{ parametro: ParametroFinanciero }>(`${this.base}/${id}`, payload);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }

  getHistorial(id: number): Observable<{ data: ParametroHistorial[] }> {
    return this.http.get<{ data: ParametroHistorial[] }>(`${this.base}/${id}/historial`);
  }
}

export interface ParametroHistorial {
  id: number;
  campo: string | null;
  valorAnterior: string | null;
  valorNuevo: string | null;
  usuarioId: number | null;
  fecha: string;
}
