import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '../auth/auth.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { ProyeccionesModule } from '../proyecciones/proyecciones.module';
import { ProcesosModule } from '../procesos/procesos.module';
import { ScheduledTasksService } from './scheduled-tasks.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ProyeccionesModule,
    ProcesosModule,
    DashboardModule,
    NotificacionesModule,
    AuthModule,
  ],
  providers: [ScheduledTasksService],
})
export class JobsModule {}