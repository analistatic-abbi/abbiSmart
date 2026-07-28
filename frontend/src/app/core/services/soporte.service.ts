import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EnviarSoportePayload {
  categoria?: string;
  asunto?: string;
  mensaje: string;
  paginaActual?: string;
}

@Injectable({ providedIn: 'root' })
export class SoporteService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  enviarMensaje(payload: EnviarSoportePayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/soporte/mensaje`, payload);
  }
}
