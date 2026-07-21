import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from '../src/common/exceptions/http-exception.filter';

export function configureE2eEnvironment(): void {
  process.env.JWT_ACCESS_SECRET =
    'test-jwt-access-secret-minimum-32-characters-long';
  process.env.COOKIE_SECURE = 'false';
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
