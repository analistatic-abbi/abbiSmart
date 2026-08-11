import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CargaMasivaLog,
  CargaMasivaResult,
  CargaMasivaRevertResult,
} from '../models/carga-masiva.model';

export type {
  CargaMasivaLog,
  CargaMasivaResult,
  CargaMasivaFilaError,
  CargaMasivaDetalleCreado,
  CargaMasivaRevertResult,
} from '../models/carga-masiva.model';

@Injectable({ providedIn: 'root' })
export class CargaMasivaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/carga-masiva`;

  getLogs(): Observable<{ data: CargaMasivaLog[] }> {
    return this.http.get<{ data: CargaMasivaLog[] }>(`${this.base}/logs`);
  }

  importClientes(file: File): Observable<CargaMasivaResult & { message: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<CargaMasivaResult & { message: string }>(`${this.base}/clientes`, form);
  }

  importContactos(file: File): Observable<CargaMasivaResult & { message: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<CargaMasivaResult & { message: string }>(`${this.base}/contactos`, form);
  }

  importProyecciones(file: File): Observable<CargaMasivaResult & { message: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<CargaMasivaResult & { message: string }>(`${this.base}/proyecciones`, form);
  }

  revertirCarga(
    logId: number,
    confirmarDependientes = false,
  ): Observable<CargaMasivaRevertResult & { message: string }> {
    let params = new HttpParams();
    if (confirmarDependientes) {
      params = params.set('confirmarDependientes', 'true');
    }

    return this.http.post<CargaMasivaRevertResult & { message: string }>(
      `${this.base}/logs/${logId}/revertir`,
      {},
      { params },
    );
  }
}
