import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ClienteOption, UbicacionOption } from '../models/proceso.model';

@Injectable({ providedIn: 'root' })
export class CatalogosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}`;

  getPaises(): Observable<{ data: Array<{ id: number; nombre: string }> }> {
    return this.http.get<{ data: Array<{ id: number; nombre: string }> }>(
      `${this.base}/catalogos/paises`,
    );
  }

  getDepartamentos(): Observable<{ data: string[] }> {
    return this.http.get<{ data: string[] }>(`${this.base}/catalogos/ubicaciones/departamentos`);
  }

  getMunicipios(departamento: string): Observable<{ data: UbicacionOption[]; total: number }> {
    return this.http.get<{ data: UbicacionOption[]; total: number }>(
      `${this.base}/catalogos/ubicaciones`,
      { params: { departamento, limit: 200 } },
    );
  }

  getClientes(search = ''): Observable<{ data: ClienteOption[] }> {
    return this.http.get<{ data: ClienteOption[] }>(`${this.base}/clientes`, {
      params: { page: 1, limit: 100, search },
    });
  }
}
