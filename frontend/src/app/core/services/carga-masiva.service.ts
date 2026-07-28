import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CargaMasivaLog {
  id: number;
  entidad: string;
  nombreArchivo: string;
  filasExitosas: number;
  filasRechazadas: number;
  fechaCarga: string;
}

export interface CargaMasivaResult {
  filasExitosas: number;
  filasRechazadas: number;
  detalleErrores?: Array<{ fila: number; error: string }> | null;
}

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
}
