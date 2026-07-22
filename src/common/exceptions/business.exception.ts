import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes.enum';

export class BusinessException extends HttpException {
  constructor(
    public readonly errorCode: ErrorCode | string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: Record<string, unknown>,
  ) {
    super({ errorCode, message, statusCode: status, ...details }, status);
  }
}
