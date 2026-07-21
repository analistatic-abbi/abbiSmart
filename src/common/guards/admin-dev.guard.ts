import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { BusinessException } from '../exceptions/business.exception';
import { ErrorCode } from '../exceptions/error-codes.enum';

@Injectable()
export class AdminDevGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const adminDevKey = this.configService.get<string>('security.adminDevKey');

    if (!adminDevKey) {
      throw new BusinessException(
        ErrorCode.PERMISO_DENEGADO,
        'Endpoint protegido: configure ADMIN_DEV_KEY hasta implementar JWT',
        403,
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = request.header('x-admin-dev-key');

    if (!providedKey || providedKey !== adminDevKey) {
      throw new BusinessException(
        ErrorCode.PERMISO_DENEGADO,
        'No tiene permisos para realizar esta acción',
        403,
      );
    }

    return true;
  }
}
