import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { descargarBlob, parseBlobErrorMessage } from '../utils/blob-download.util';
import {
  CreateProcesoPayload,
  EstadoProceso,
  Proceso,
  ProcesoContacto,
  ProcesoListItem,
  ProcesoTarea,
  SegmentoProceso,
  TipoInstrumento,
  TipoProceso,
} from '../models/proceso.model';
import { FiltroEliminados } from '../models/filtro-eliminados.model';
import { AuditLog, Proyeccion } from '../models/admin.model';

export interface ProcesoComentario {
  id: number;
  procesoId: number;
  usuarioId: number;
  usuarioNombre: string;
  texto: string;
  fechaCreacion: string;
}

export interface ProcesosListParams {
  page?: number;
  limit?: number;
  search?: string;
  estado?: EstadoProceso;
  segmento?: string;
  tipoProceso?: TipoProceso;
  tipoInstrumento?: TipoInstrumento;
  portalOrigen?: string;
  empresaClienteId?: number;
  fechaCierreDesde?: string;
  fechaCierreHasta?: string;
  filtroEliminados?: FiltroEliminados;
  /** @deprecated use filtroEliminados */
  incluirEliminados?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProcesosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/procesos`;

  list(
    params: ProcesosListParams = {},
  ): Observable<{ data: ProcesoListItem[]; total: number }> {
    const query: Record<string, string | number | boolean> = {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    };

    if (params.search?.trim()) query['search'] = params.search.trim();
    if (params.estado) query['estado'] = params.estado;
    if (params.segmento) query['segmento'] = params.segmento;
    if (params.tipoProceso) query['tipoProceso'] = params.tipoProceso;
    if (params.tipoInstrumento) query['tipoInstrumento'] = params.tipoInstrumento;
    if (params.portalOrigen) query['portalOrigen'] = params.portalOrigen;
    if (params.empresaClienteId) query['empresaClienteId'] = params.empresaClienteId;
    if (params.fechaCierreDesde) query['fechaCierreDesde'] = params.fechaCierreDesde;
    if (params.fechaCierreHasta) query['fechaCierreHasta'] = params.fechaCierreHasta;
    if (params.filtroEliminados && params.filtroEliminados !== 'activos') {
      query['filtroEliminados'] = params.filtroEliminados;
    } else if (params.incluirEliminados) {
      query['filtroEliminados'] = 'todos';
    }

    return this.http.get<{ data: ProcesoListItem[]; total: number }>(this.base, {
      params: query,
    });
  }

  exportar(params: ProcesosListParams = {}, onError?: (message: string) => void): void {
    const query: Record<string, string> = {};

    if (params.search?.trim()) query['search'] = params.search.trim();
    if (params.estado) query['estado'] = params.estado;
    if (params.segmento) query['segmento'] = params.segmento;
    if (params.tipoProceso) query['tipoProceso'] = params.tipoProceso;
    if (params.tipoInstrumento) query['tipoInstrumento'] = params.tipoInstrumento;
    if (params.portalOrigen) query['portalOrigen'] = params.portalOrigen;
    if (params.empresaClienteId) query['empresaClienteId'] = String(params.empresaClienteId);
    if (params.fechaCierreDesde) query['fechaCierreDesde'] = params.fechaCierreDesde;
    if (params.fechaCierreHasta) query['fechaCierreHasta'] = params.fechaCierreHasta;
    if (params.filtroEliminados && params.filtroEliminados !== 'activos') {
      query['filtroEliminados'] = params.filtroEliminados;
    } else if (params.incluirEliminados) {
      query['filtroEliminados'] = 'todos';
    }

    this.http
      .get(`${this.base}/export`, { params: query, responseType: 'blob', observe: 'response' })
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

  getFechasHistorial(id: number): Observable<{ data: AuditLog[] }> {
    return this.http.get<{ data: AuditLog[] }>(`${this.base}/${id}/fechas/historial`);
  }

  getComentarios(id: number): Observable<{ data: ProcesoComentario[] }> {
    return this.http.get<{ data: ProcesoComentario[] }>(`${this.base}/${id}/comentarios`);
  }

  getContactos(id: number): Observable<{ data: ProcesoContacto[] }> {
    return this.http.get<{ data: ProcesoContacto[] }>(`${this.base}/${id}/contactos`);
  }

  setContactos(id: number, contactoIds: number[]): Observable<{ data: ProcesoContacto[] }> {
    return this.http.put<{ data: ProcesoContacto[] }>(`${this.base}/${id}/contactos`, {
      contactoIds,
    });
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
    form.append('evidencia', evidencia.trim());
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
