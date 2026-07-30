import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthState,
  LoginResponse,
  SessionInfo,
  UsuarioSesion,
} from '../models/auth.model';

const STORAGE_KEY = 'abbi_auth_state';
const PRE_AUTH_KEY = 'abbi_pre_auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = environment.apiUrl;

  private readonly state = signal<AuthState>(this.loadState());

  readonly usuario = computed(() => this.state().usuario);
  readonly session = computed(() => this.state().session);
  readonly accessToken = computed(() => this.state().accessToken);
  readonly isAuthenticated = computed(() => !!this.state().accessToken);
  readonly rol = computed(() => this.state().usuario?.rol ?? null);
  readonly paisNombre = computed(() => this.state().paisNombre);

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  login(correo: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/login`, { correo, password }, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.requiresCountrySelection) {
            if (response.preAuthToken) {
              sessionStorage.setItem(PRE_AUTH_KEY, response.preAuthToken);
            }
            if (response.paises) {
              this.setPreAuthPaises(response.paises);
            }
            void this.router.navigate(['/select-country']);
            return;
          }

          if (response.accessToken && response.usuario && response.session) {
            this.setSession(response.accessToken, response.usuario, response.session);
            void this.router.navigate(['/dashboard']);
          }
        }),
      );
  }

  selectCountry(paisId: number): Observable<LoginResponse> {
    const preAuthToken = sessionStorage.getItem(PRE_AUTH_KEY);

    if (!preAuthToken) {
      return throwError(() => new Error('No hay token de pre-autenticación'));
    }

    return this.http
      .post<LoginResponse>(
        `${this.apiUrl}/auth/select-country`,
        { paisId },
        {
          withCredentials: true,
          headers: { 'x-pre-auth-token': preAuthToken },
        },
      )
      .pipe(
        tap((response) => {
          sessionStorage.removeItem(PRE_AUTH_KEY);
          this.clearCountryChangeMode();
          if (response.accessToken && response.usuario && response.session) {
            this.setSession(response.accessToken, response.usuario, response.session);
            void this.router.navigate(['/dashboard']);
          }
        }),
      );
  }

  activate(token: string, password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/activate`, {
      token,
      password,
    });
  }

  resetPassword(token: string, password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/reset-password`, {
      token,
      password,
    });
  }

  forgotPassword(correo: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/forgot-password`, {
      correo,
    });
  }

  refresh(): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/refresh`, {}, { withCredentials: true })
      .pipe(
        tap((response) => {
          if (response.accessToken && response.usuario && response.session) {
            this.setSession(response.accessToken, response.usuario, response.session);
          }
        }),
      );
  }

  /** Clears local auth state without calling the API. */
  clearLocalSession(): void {
    this.clearSession();
  }

  /** Clears session and returns to login (e.g. expired refresh token). */
  forceLogout(): void {
    this.clearSession();
    void this.router.navigate(['/login']);
  }

  logout(): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${this.apiUrl}/auth/logout`, {}, { withCredentials: true })
      .pipe(
        catchError(() => of({ message: 'Sesión cerrada localmente' })),
        tap(() => this.forceLogout()),
      );
  }

  prepareCountryChange(): Observable<{
    message: string;
    preAuthToken: string;
    paises: Array<{ id: number; nombre: string }>;
  }> {
    return this.http
      .post<{
        message: string;
        preAuthToken: string;
        paises: Array<{ id: number; nombre: string }>;
      }>(`${this.apiUrl}/auth/prepare-country-change`, {}, { withCredentials: true })
      .pipe(
        tap((response) => {
          sessionStorage.setItem(PRE_AUTH_KEY, response.preAuthToken);
          this.setPreAuthPaises(response.paises);
          sessionStorage.setItem('abbi_country_change', 'true');
          const current = this.state();
          this.state.set({
            accessToken: null,
            usuario: current.usuario,
            session: null,
            paisNombre: current.paisNombre,
          });
          this.persistState();
          void this.router.navigate(['/select-country']);
        }),
      );
  }

  isCountryChangeMode(): boolean {
    return sessionStorage.getItem('abbi_country_change') === 'true';
  }

  clearCountryChangeMode(): void {
    sessionStorage.removeItem('abbi_country_change');
  }

  canChangeCountry(): boolean {
    const rol = this.rol();
    return !!rol && rol !== 'Operador' && this.isAuthenticated();
  }

  puedeEscribir(): boolean {
    const rol = this.rol();
    return (
      rol === 'Administrador' ||
      rol === 'Supervisor del Sistema' ||
      rol === 'Operador'
    );
  }

  puedeCerrarProyeccion(): boolean {
    const rol = this.rol();
    return rol === 'Administrador' || rol === 'Supervisor del Sistema';
  }

  puedeAsignarMercadoProyeccion(): boolean {
    return this.puedeCerrarProyeccion();
  }

  puedeVerEliminados(): boolean {
    const rol = this.rol();
    return rol === 'Administrador' || rol === 'Supervisor del Sistema';
  }

  setPaisNombre(nombre: string): void {
    const current = this.state();
    this.state.set({ ...current, paisNombre: nombre });
    this.persistState();
  }

  getPreAuthPaises(): Array<{ id: number; nombre: string }> {
    const raw = sessionStorage.getItem('abbi_pre_auth_paises');
    return raw ? (JSON.parse(raw) as Array<{ id: number; nombre: string }>) : [];
  }

  setPreAuthPaises(paises: Array<{ id: number; nombre: string }>): void {
    sessionStorage.setItem('abbi_pre_auth_paises', JSON.stringify(paises));
  }

  private setSession(
    accessToken: string,
    usuario: UsuarioSesion,
    session: SessionInfo,
  ): void {
    this.state.set({
      accessToken,
      usuario,
      session,
      paisNombre: this.state().paisNombre,
    });
    this.persistState();
  }

  clearSession(): void {
    sessionStorage.removeItem(PRE_AUTH_KEY);
    sessionStorage.removeItem('abbi_pre_auth_paises');
    sessionStorage.removeItem('abbi_country_change');
    this.state.set({
      accessToken: null,
      usuario: null,
      session: null,
      paisNombre: null,
    });
    localStorage.removeItem(STORAGE_KEY);
  }

  private loadState(): AuthState {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { accessToken: null, usuario: null, session: null, paisNombre: null };
    }

    try {
      return JSON.parse(raw) as AuthState;
    } catch {
      return { accessToken: null, usuario: null, session: null, paisNombre: null };
    }
  }

  private persistState(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state()));
  }
}
