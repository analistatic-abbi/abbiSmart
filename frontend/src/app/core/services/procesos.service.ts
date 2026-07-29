import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { descargarBlob, parseBlobErrorMessage } from '../utils/blob-download.util';
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

export interface ProcesoComentario {
  id: number;
  procesoId: number;
  usuarioId: number;
  usuarioNombre: string;
  texto: string;
  fechaCreacion: string;
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

  exportar(search = '', onError?: (message: string) => void): void {
    const params: Record<string, string> = {};
    if (search.trim()) params['search'] = search.trim();

    this.http
      .get(`${this.base}/export`, { params, responseType: 'blob', observe: 'response' })
      .subscribe({
        next: async (response) => {
          const blob = response.body;
          if (!blob || blob.size === 0) {
            onError?.('La exportación no devolvió datos.');
            return;
          }

          const contentType = response.headers.get('Content-Type') ?? '';
          if (contentType.includes('application/json')) {
            const text = await blob.text();
            try {
              const json = JSON.parse(text) as { message?: string };
              onError?.(json.message ?? 'No fue posible exportar los procesos.');
            } catch {
              onError?.('No fue posible exportar los procesos.');
            }
            return;
          }

          const fecha = new Date().toISOString().slice(0, 10);
          await descargarBlob(blob, `procesos-${fecha}.xlsx`);
        },
        error: async (err: HttpErrorResponse) => {
          const message = await parseBlobErrorMessage(
            err,
            'No fue posible exportar los procesos.',
          );
          onError?.(message);
        },
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

  getComentarios(id: number): Observable<{ data: ProcesoComentario[] }> {
    return this.http.get<{ data: ProcesoComentario[] }>(`${this.base}/${id}/comentarios`);
  }

  crearComentario(id: number, texto: string): Observable<{ comentario: ProcesoComentario }> {
    return this.http.post<{ comentario: ProcesoComentario }>(`${this.base}/${id}/comentarios`, {
      texto,
    });
  }

  cambiarEstado(
    id: number,
    estado: EstadoProceso,
    motivoPerdida?: string,
    motivoPerdidaOtro?: string,
  ): Observable<{ proceso: Proceso; proyeccionGenerada: Proyeccion | null }> {
    const body: Record<string, string> = { estado };
    if (motivoPerdida) body['motivoPerdida'] = motivoPerdida;
    if (motivoPerdidaOtro) body['motivoPerdidaOtro'] = motivoPerdidaOtro;

    return this.http.patch<{ proceso: Proceso; proyeccionGenerada: Proyeccion | null }>(
      `${this.base}/${id}/estado`,
      body,
    );
  }

  registrarMotivoPerdida(
    id: number,
    motivoPerdida: string,
    motivoPerdidaOtro?: string,
  ): Observable<{ proceso: Proceso }> {
    const body: Record<string, string> = { motivoPerdida };
    if (motivoPerdidaOtro) body['motivoPerdidaOtro'] = motivoPerdidaOtro;
    return this.http.patch<{ proceso: Proceso }>(`${this.base}/${id}/motivo-perdida`, body);
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
