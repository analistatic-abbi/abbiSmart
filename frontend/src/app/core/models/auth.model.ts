import { Rol } from './rol.enum';

export interface UsuarioSesion {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
}

export interface SessionInfo {
  id: number;
  paisSesionId: number;
  fechaExpiracion: string;
}

export interface AuthState {
  accessToken: string | null;
  usuario: UsuarioSesion | null;
  session: SessionInfo | null;
  paisNombre: string | null;
}

export interface LoginResponse {
  message: string;
  requiresCountrySelection: boolean;
  preAuthToken?: string;
  usuario?: UsuarioSesion;
  paises?: Array<{ id: number; nombre: string }>;
  accessToken?: string;
  expiresIn?: string;
  session?: SessionInfo;
}

export interface ApiErrorBody {
  errorCode?: string;
  message?: string;
  statusCode?: number;
}
