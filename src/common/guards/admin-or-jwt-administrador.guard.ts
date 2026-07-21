import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Rol } from '../enums/rol.enum';
import { BusinessException } from '../exceptions/business.exception';
import { ErrorCode } from '../exceptions/error-codes.enum';
import type {
  AuthUserPayload,
  JwtPayload,
} from '../../modules/auth/interfaces/auth-user-payload.interface';

@Injectable()
export class AdminOrJwtAdministradorGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUserPayload }>();

    const adminDevKey = this.configService.get<string>('security.adminDevKey');
    const providedKey = request.header('x-admin-dev-key');

    if (adminDevKey && providedKey === adminDevKey) {
      return true;
    }

    const authHeader = request.header('authorization');

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);

      try {
        const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

        if (payload.rol === Rol.ADMINISTRADOR) {
          request.user = {
            userId: payload.sub,
            rol: payload.rol,
            sessionId: payload.sessionId,
            paisSesionId: payload.paisSesionId,
          };
          return true;
        }
      } catch {
        // continuar al error final
      }
    }

    throw new BusinessException(
      ErrorCode.PERMISO_DENEGADO,
      'No tiene permisos para realizar esta acción',
      403,
    );
  }
}
