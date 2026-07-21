import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { BusinessException } from '../exceptions/business.exception';
import { ErrorCode } from '../exceptions/error-codes.enum';
import { PreAuthService } from '../../modules/auth/pre-auth.service';

@Injectable()
export class PreAuthGuard implements CanActivate {
  constructor(private readonly preAuthService: PreAuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const rawToken = request.header('x-pre-auth-token');

    if (!rawToken) {
      throw new BusinessException(
        ErrorCode.AUTH_PRE_AUTH_INVALIDO,
        'Se requiere autenticación previa al login',
        401,
      );
    }

    const usuarioId = this.preAuthService.validateToken(rawToken);

    if (!usuarioId) {
      throw new BusinessException(
        ErrorCode.AUTH_PRE_AUTH_INVALIDO,
        'La autenticación previa no es válida o expiró',
        401,
      );
    }

    request.preAuthUserId = usuarioId;
    request.preAuthToken = rawToken;

    return true;
  }
}
