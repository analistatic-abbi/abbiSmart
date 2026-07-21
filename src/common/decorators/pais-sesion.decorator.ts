import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUserPayload } from '../../modules/auth/interfaces/auth-user-payload.interface';

export const PaisSesion = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUserPayload }>();
    return request.user.paisSesionId;
  },
);
