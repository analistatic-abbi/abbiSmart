import { Rol } from '../../../common/enums/rol.enum';

export interface JwtPayload {
  sub: number;
  rol: Rol;
  sessionId: number;
  paisSesionId: number;
  jti: string;
}

export interface AuthUserPayload {
  userId: number;
  rol: Rol;
  sessionId: number;
  paisSesionId: number;
}
