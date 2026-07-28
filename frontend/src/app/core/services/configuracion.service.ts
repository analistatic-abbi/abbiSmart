import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ConfiguracionItem } from '../models/admin.model';

@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/configuracion`;

  list(): Observable<{ data: ConfiguracionItem[] }> {
    return this.http.get<{ data: ConfiguracionItem[] }>(this.base);
  }

  update(clave: string, valor: string): Observable<{ configuracion: ConfiguracionItem }> {
    return this.http.patch<{ configuracion: ConfiguracionItem }>(`${this.base}/${clave}`, { valor });
  }
}
