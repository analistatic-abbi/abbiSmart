import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateProcesoPayload,
  Proceso,
  ProcesoListItem,
  ProcesoTarea,
  EstadoProceso,
} from '../models/proceso.model';
import { Proyeccion } from '../models/admin.model';

export interface FechaHistorial {
  id: number;
  campo: string | null;
  valorAnterior: string | null;
  valorNuevo: string | null;
  fecha: string;
}

@Injectable({ providedIn: 'root' })
export class ProcesosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/procesos`;

  list(page = 1, limit = 20, search = ''): Observable<{ data: ProcesoListItem[]; total: number }> {
    const params: Record<string, string | number> = { page, limit };
    if (search.trim()) params['search'] = search.trim();
    return this.http.get<{ data: ProcesoListItem[]; total: number }>(this.base, {
      params,
    });
  }

  getById(id: number): Observable<{ proceso: Proceso }> {
    return this.http.get<{ proceso: Proceso }>(`${this.base}/${id}`);
  }

  create(payload: CreateProcesoPayload): Observable<{ proceso: Proceso }> {
    return this.http.post<{ proceso: Proceso }>(this.base, payload);
  }

  updateFechas(id: number, fechas: Record<string, string | null>): Observable<{ proceso: Proceso }> {
    return this.http.patch<{ proceso: Proceso }>(`${this.base}/${id}/fechas`, fechas);
  }

  getFechasHistorial(id: number): Observable<{ data: FechaHistorial[] }> {
    return this.http.get<{ data: FechaHistorial[] }>(`${this.base}/${id}/fechas/historial`);
  }

  cambiarEstado(
    id: number,
    estado: EstadoProceso,
  ): Observable<{ proceso: Proceso; proyeccionGenerada: Proyeccion | null }> {
    return this.http.patch<{ proceso: Proceso; proyeccionGenerada: Proyeccion | null }>(
      `${this.base}/${id}/estado`,
      { estado },
    );
  }

  getTareas(id: number): Observable<{ data: ProcesoTarea[] }> {
    return this.http.get<{ data: ProcesoTarea[] }>(`${this.base}/${id}/tareas`);
  }

  completarTarea(
    procesoId: number,
    tareaId: number,
    evidencia: string,
    archivo?: File | null,
  ): Observable<{ tarea: ProcesoTarea }> {
    const form = new FormData();
    form.append('confirmar', 'true');
    if (evidencia.trim()) {
      form.append('evidencia', evidencia.trim());
    }
    if (archivo) {
      form.append('archivo', archivo, archivo.name);
    }

    return this.http.patch<{ tarea: ProcesoTarea }>(
      `${this.base}/${procesoId}/tareas/${tareaId}/completar`,
      form,
    );
  }

  descargarEvidencia(procesoId: number, tareaId: number, nombre: string): void {
    this.http
      .get(`${this.base}/${procesoId}/tareas/${tareaId}/evidencia`, {
        responseType: 'blob',
      })
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = nombre;
          a.click();
          URL.revokeObjectURL(url);
        },
      });
  }

  getDependencias(id: number): Observable<{
    data: {
      tieneDependientes: boolean;
      dependientes: Array<{ tipo: string; id: number; descripcion: string }>;
      sugerencias: string[];
    };
  }> {
    return this.http.get<{
      data: {
        tieneDependientes: boolean;
        dependientes: Array<{ tipo: string; id: number; descripcion: string }>;
        sugerencias: string[];
      };
    }>(`${this.base}/${id}/dependencias`);
  }

  eliminar(id: number, confirmarDependientes = false): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`, {
      params: confirmarDependientes ? { confirmarDependientes: 'true' } : {},
    });
  }
}
