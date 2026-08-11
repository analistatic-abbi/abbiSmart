import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type CalendarioEventoTipo =
  | 'proyeccion'
  | 'proceso'
  | 'relacionamiento'
  | 'kam'
  | 'reunion_aclaratoria';

export interface CalendarioEvento {
  id: number;
  tipo: CalendarioEventoTipo;
  fecha: string;
  titulo: string;
  subtitulo?: string | null;
  empresa?: string | null;
  objeto?: string | null;
  valor?: string | null;
  estado: string;
  icono: string;
  kamId?: number;
  detalle?: string | null;
}

@Injectable({ providedIn: 'root' })
export class CalendarioService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/calendario`;

  getEventos(anio: number, tipos: CalendarioEventoTipo[]): Observable<{ data: CalendarioEvento[] }> {
    return this.http.get<{ data: CalendarioEvento[] }>(`${this.base}/eventos`, {
      params: {
        anio,
        tipos: tipos.join(','),
      },
    });
  }
}
