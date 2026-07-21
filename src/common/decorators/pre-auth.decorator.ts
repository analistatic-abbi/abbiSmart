import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const PreAuthUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.preAuthUserId as number;
  },
);

export const PreAuthToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.preAuthToken as string;
  },
);
