import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_WRITE_ACCESS_KEY } from '../decorators/require-write-access.decorator';
import { BusinessException } from '../exceptions/business.exception';
import { ErrorCode } from '../exceptions/error-codes.enum';
import { PermisosService } from '../services/permisos.service';
import type { AuthUserPayload } from '../../modules/auth/interfaces/auth-user-payload.interface';

@Injectable()
export class WriteAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permisosService: PermisosService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requireWrite = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_WRITE_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requireWrite) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUserPayload }>();
    const user = request.user;

    if (!user || !this.permisosService.puedeEscribir(user.rol)) {
      throw new BusinessException(
        ErrorCode.PERMISO_DENEGADO,
        'Su rol solo tiene permisos de lectura',
        403,
      );
    }

    return true;
  }
}
