import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertaEnviada } from '../../database/entities/alerta-enviada.entity';
import { Proceso } from '../../database/entities/proceso.entity';
import { AuthModule } from '../auth/auth.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { ProyeccionesModule } from '../proyecciones/proyecciones.module';
import { ScheduledTasksService } from './scheduled-tasks.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([AlertaEnviada, Proceso]),
    ProyeccionesModule,
    NotificacionesModule,
    AuthModule,
  ],
  providers: [ScheduledTasksService],
})
export class JobsModule {}
