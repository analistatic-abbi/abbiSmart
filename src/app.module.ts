import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AuthorizationModule } from './common/authorization.module';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuthorizationDemoModule } from './modules/authorization-demo/authorization-demo.module';
import { CatalogosModule } from './modules/catalogos/catalogos.module';
import { ConfiguracionModule } from './modules/configuracion/configuracion.module';
import { ClientesModule } from './modules/clientes/clientes.module';
import { ContactosModule } from './modules/contactos/contactos.module';
import { RelacionamientosModule } from './modules/relacionamientos/relacionamientos.module';
import { CargaMasivaModule } from './modules/carga-masiva/carga-masiva.module';
import { ParametrosModule } from './modules/parametros/parametros.module';
import { ProcesosModule } from './modules/procesos/procesos.module';
import { ValidacionModule } from './modules/validacion/validacion.module';
import { SolicitudesEliminacionModule } from './modules/solicitudes-eliminacion/solicitudes-eliminacion.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ProyeccionesModule } from './modules/proyecciones/proyecciones.module';
import { NotificacionesModule } from './modules/notificaciones/notificaciones.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    AppConfigModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('throttle.ttl') ?? 60000,
          limit: configService.get<number>('throttle.limit') ?? 10,
        },
      ],
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('app.nodeEnv');
        const isDevelopment = nodeEnv === 'development';

        return {
          pinoHttp: {
            level: configService.get<string>('app.logLevel'),
            transport: isDevelopment
              ? {
                  target: 'pino-pretty',
                  options: {
                    singleLine: true,
                    colorize: true,
                  },
                }
              : undefined,
            autoLogging: true,
            redact: ['req.headers.authorization', 'req.headers.cookie'],
          },
        };
      },
    }),
    DatabaseModule,
    AuditModule,
    AuthModule,
    AuthorizationModule,
    HealthModule,
    UsersModule,
    AuthorizationDemoModule,
    CatalogosModule,
    ConfiguracionModule,
    ClientesModule,
    ContactosModule,
    RelacionamientosModule,
    CargaMasivaModule,
    ParametrosModule,
    ProcesosModule,
    ValidacionModule,
    SolicitudesEliminacionModule,
    DashboardModule,
    ProyeccionesModule,
    NotificacionesModule,
    JobsModule,
  ],
})
export class AppModule {}
