import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SKIP_PAIS_SESION_KEY } from '../decorators/skip-pais-sesion.decorator';
import { BusinessException } from '../exceptions/business.exception';
import { ErrorCode } from '../exceptions/error-codes.enum';
import type { AuthUserPayload } from '../../modules/auth/interfaces/auth-user-payload.interface';

@Injectable()
export class PaisSesionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const skipPaisSesion = this.reflector.getAllAndOverride<boolean>(
      SKIP_PAIS_SESION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipPaisSesion) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUserPayload }>();
    const user = request.user;

    if (!user?.paisSesionId) {
      throw new BusinessException(
        ErrorCode.PAIS_SESION_REQUERIDO,
        'Debe seleccionar un país de sesión',
        403,
      );
    }

    return true;
  }
}
