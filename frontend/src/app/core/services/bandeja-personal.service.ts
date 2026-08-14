import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type FijacionEntidadTipo =
  | 'proceso'
  | 'proyeccion'
  | 'relacionamiento'
  | 'kam';
export type BandejaUrgencia = 'alta' | 'media' | 'baja' | 'sin_fecha';

export interface BandejaItem {
  id: number;
  entidadTipo: FijacionEntidadTipo;
  titulo: string;
  subtitulo?: string | null;
  empresa?: string | null;
  objeto?: string | null;
  estado: string;
  fecha: string;
  fechaRelevanteLabel: string;
  diasRestantes: number | null;
  urgencia: BandejaUrgencia;
  icono: string;
  ruta: string;
  fechaFijacion: string;
}

export interface BandejaResumenConteo {
  clave: string;
  total: number;
}

export interface BandejaResumen {
  totalFijados: number;
  totalProcesos: number;
  totalProyecciones: number;
  totalRelacionamientos: number;
  totalKams: number;
  urgentes: number;
  vencidos: number;
  porUrgencia: BandejaResumenConteo[];
  porEstadoProcesos: BandejaResumenConteo[];
}

export interface BandejaPersonalData {
  resumen: BandejaResumen;
  procesos: BandejaItem[];
  proyecciones: BandejaItem[];
  relacionamientos: BandejaItem[];
  kams: BandejaItem[];
}

@Injectable({ providedIn: 'root' })
export class BandejaPersonalService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/bandeja-personal`;

  getBandeja(): Observable<{ data: BandejaPersonalData }> {
    return this.http.get<{ data: BandejaPersonalData }>(this.base);
  }

  fijar(entidadTipo: FijacionEntidadTipo, entidadId: number | string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.base, {
      entidadTipo,
      entidadId: Number(entidadId),
    });
  }

  desfijar(entidadTipo: FijacionEntidadTipo, entidadId: number | string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.base}/${entidadTipo}/${Number(entidadId)}`,
    );
  }

  getEstado(
    entidadTipo: FijacionEntidadTipo,
    entidadId: number | string,
  ): Observable<{ data: { fijado: boolean } }> {
    return this.http.get<{ data: { fijado: boolean } }>(
      `${this.base}/estado/${entidadTipo}/${Number(entidadId)}`,
    );
  }
}
