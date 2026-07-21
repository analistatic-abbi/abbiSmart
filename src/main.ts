import {
  ClassSerializerInterceptor,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/exceptions/http-exception.filter';

function setupSwagger(
  app: Awaited<ReturnType<typeof NestFactory.create>>,
  configService: ConfigService,
): void {
  const enabled = configService.get<boolean>('swagger.enabled') ?? true;

  if (!enabled) {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle(configService.get<string>('swagger.title') ?? 'Smart Licitaciones API')
    .setDescription(
      configService.get<string>('swagger.description') ??
        'API backend del sistema de gestión de licitaciones ABBI',
    )
    .setVersion(configService.get<string>('swagger.version') ?? '1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const path = configService.get<string>('swagger.path') ?? 'api/docs';

  SwaggerModule.setup(path, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('app.nodeEnv') ?? 'development';
  const apiPrefix = configService.get<string>('app.apiPrefix') ?? 'api/v1';
  const corsOrigins = configService.get<string[]>('app.corsOrigins') ?? [];
  const port = configService.get<number>('app.port') ?? 3000;

  app.useLogger(app.get(Logger));
  app.use(cookieParser());
  app.use(
    helmet({
      contentSecurityPolicy: nodeEnv === 'production',
    }),
  );
  app.setGlobalPrefix(apiPrefix);
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  setupSwagger(app, configService);

  await app.listen(port);
}

void bootstrap();
