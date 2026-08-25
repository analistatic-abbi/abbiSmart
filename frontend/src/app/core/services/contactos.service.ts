import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Contacto, CreateContactoPayload } from '../models/crm.model';
import { descargarBlob, parseBlobErrorMessage } from '../utils/blob-download.util';

@Injectable({ providedIn: 'root' })
export class ContactosService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(params: {
    page?: number;
    limit?: number;
    search?: string;
    clienteId?: number;
    esGenerico?: boolean;
  } = {}): Observable<{ data: Contacto[]; total: number }> {
    const query: Record<string, string | number | boolean> = {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    };
    if (params.search) query['search'] = params.search;
    if (params.clienteId) query['clienteId'] = params.clienteId;
    if (params.esGenerico !== undefined) {
      query['esGenerico'] = params.esGenerico ? 'true' : 'false';
    }

    return this.http.get<{ data: Contacto[]; total: number }>(`${this.base}/contactos`, {
      params: query,
    });
  }

  exportar(params: {
    search?: string;
    clienteId?: number;
    esGenerico?: boolean;
  } = {}, onError?: (message: string) => void): void {
    const query: Record<string, string> = {};
    if (params.search?.trim()) query['search'] = params.search.trim();
    if (params.clienteId) query['clienteId'] = String(params.clienteId);
    if (params.esGenerico !== undefined) {
      query['esGenerico'] = params.esGenerico ? 'true' : 'false';
    }

    this.http
      .get(`${this.base}/contactos/export`, {
        params: query,
        responseType: 'blob',
        observe: 'response',
      })
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
              onError?.(json.message ?? 'No fue posible exportar los contactos.');
            } catch {
              onError?.('No fue posible exportar los contactos.');
            }
            return;
          }

          const fecha = new Date().toISOString().slice(0, 10);
          await descargarBlob(blob, `contactos-${fecha}.xlsx`);
        },
        error: async (err: HttpErrorResponse) => {
          const message = await parseBlobErrorMessage(
            err,
            'No fue posible exportar los contactos.',
          );
          onError?.(message);
        },
      });
  }

  listByCliente(clienteId: number): Observable<{ data: Contacto[] }> {
    return this.http.get<{ data: Contacto[] }>(`${this.base}/clientes/${clienteId}/contactos`);
  }

  getById(id: number): Observable<{ contacto: Contacto }> {
    return this.http.get<{ contacto: Contacto }>(`${this.base}/contactos/${id}`);
  }

  create(clienteId: number, payload: CreateContactoPayload): Observable<{ contacto: Contacto }> {
    return this.http.post<{ contacto: Contacto }>(
      `${this.base}/clientes/${clienteId}/contactos`,
      payload,
    );
  }

  update(id: number, payload: Partial<CreateContactoPayload>): Observable<{ contacto: Contacto }> {
    return this.http.patch<{ contacto: Contacto }>(`${this.base}/contactos/${id}`, payload);
  }

  buscarSimilares(
    q: string,
    clienteId?: number,
    limit = 5,
  ): Observable<{
    data: Array<{
      id: number;
      nombre: string;
      similitud: number;
      clienteNombre?: string | null;
    }>;
  }> {
    const params: Record<string, string | number> = { q, limit };
    if (clienteId) params['clienteId'] = clienteId;
    return this.http.get<{
      data: Array<{
        id: number;
        nombre: string;
        similitud: number;
        clienteNombre?: string | null;
      }>;
    }>(`${this.base}/contactos/similares`, { params });
  }

  eliminar(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/contactos/${id}`);
  }
}
