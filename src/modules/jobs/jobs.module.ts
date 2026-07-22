import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '../auth/auth.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { ProyeccionesModule } from '../proyecciones/proyecciones.module';
import { ScheduledTasksService } from './scheduled-tasks.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ProyeccionesModule,
    NotificacionesModule,
    AuthModule,
  ],
  providers: [ScheduledTasksService],
})
export class JobsModule {}
