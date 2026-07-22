import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import cookieParser from 'cookie-parser';
import { Rol } from '../src/common/enums/rol.enum';
import { HttpExceptionFilter } from '../src/common/exceptions/http-exception.filter';

export interface E2eMailMockHandlers {
  onActivationToken?: (token: string) => void;
  onResetToken?: (token: string) => void;
}

export function createE2eMailServiceMock(
  handlers: E2eMailMockHandlers = {},
) {
  return {
    shouldExposeDevTokens: jest.fn().mockReturnValue(true),
    sendActivationEmail: jest.fn(
      async (_to: string, _nombre: string, token: string) => {
        handlers.onActivationToken?.(token);
      },
    ),
    sendPasswordResetEmail: jest.fn(
      async (_to: string, _nombre: string, token: string) => {
        handlers.onResetToken?.(token);
      },
    ),
  };
}

export function configureE2eEnvironment(): void {
  process.env.JWT_ACCESS_SECRET =
    'test-jwt-access-secret-minimum-32-characters-long';
  process.env.COOKIE_SECURE = 'false';
}

export function buildE2eUserPayload(
  nombre: string,
  correo: string,
  rol: Rol,
  paisId = 1,
): Record<string, unknown> {
  return { nombre, correo, rol, paisId };
}

export function configureE2eApp(app: INestApplication): void {
  app.use(cookieParser());
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
}
