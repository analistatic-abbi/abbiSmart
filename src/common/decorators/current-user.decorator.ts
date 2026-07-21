import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUserPayload } from '../../modules/auth/interfaces/auth-user-payload.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUserPayload => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUserPayload }>();
    return request.user;
  },
);
