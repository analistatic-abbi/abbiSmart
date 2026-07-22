import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Proceso } from '../../database/entities/proceso.entity';
import { Proyeccion } from '../../database/entities/proyeccion.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { AuditModule } from '../audit/audit.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { ProcesosModule } from '../procesos/procesos.module';
import { ProyeccionesController } from './proyecciones.controller';
import { ProyeccionesService } from './proyecciones.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Proyeccion, Proceso, Usuario]),
    forwardRef(() => ProcesosModule),
    AuditModule,
    NotificacionesModule,
  ],
  controllers: [ProyeccionesController],
  providers: [ProyeccionesService],
  exports: [ProyeccionesService],
})
export class ProyeccionesModule {}
