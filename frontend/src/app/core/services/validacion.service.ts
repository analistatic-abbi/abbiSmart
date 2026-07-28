import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ValidacionPendiente, ValidacionRevision } from '../models/admin.model';

export interface ValidadorOption {
  id: number;
  nombre: string;
  correo: string;
}

@Injectable({ providedIn: 'root' })
export class ValidacionService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  listPendientes(search?: string): Observable<{ data: ValidacionPendiente[] }> {
    return this.http.get<{ data: ValidacionPendiente[] }>(`${this.base}/validacion/pendientes`, {
      params: search ? { search } : {},
    });
  }

  getRevision(procesoId: number): Observable<{ data: ValidacionRevision }> {
    return this.http.get<{ data: ValidacionRevision }>(
      `${this.base}/validacion/procesos/${procesoId}/revision`,
    );
  }

  registrarVeredicto(
    validacionId: number,
    veredicto: 'Aprobado' | 'Requiere Corrección',
    comentario?: string,
  ): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/validacion/${validacionId}/veredicto`, {
      veredicto,
      comentario,
    });
  }

  listValidadores(): Observable<{ data: ValidadorOption[] }> {
    return this.http.get<{ data: ValidadorOption[] }>(`${this.base}/validacion/validadores`);
  }

  asignarValidadores(procesoId: number, validadorIds: number[]): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/procesos/${procesoId}/validadores`, {
      validadorIds,
    });
  }

  getValidacionesProceso(procesoId: number): Observable<{
    data: Array<{
      id: number;
      validadorId: number;
      veredicto: string;
      comentario: string | null;
    }>;
  }> {
    return this.http.get<{
      data: Array<{
        id: number;
        validadorId: number;
        veredicto: string;
        comentario: string | null;
      }>;
    }>(`${this.base}/procesos/${procesoId}/validaciones`);
  }
}