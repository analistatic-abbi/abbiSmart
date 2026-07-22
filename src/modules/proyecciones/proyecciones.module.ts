import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Proceso } from '../../database/entities/proceso.entity';
import { Proyeccion } from '../../database/entities/proyeccion.entity';
import { AuditModule } from '../audit/audit.module';
import { ProcesosModule } from '../procesos/procesos.module';
import { ProyeccionesController } from './proyecciones.controller';
import { ProyeccionesService } from './proyecciones.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Proyeccion, Proceso]),
    forwardRef(() => ProcesosModule),
    AuditModule,
  ],
  controllers: [ProyeccionesController],
  providers: [ProyeccionesService],
  exports: [ProyeccionesService],
})
export class ProyeccionesModule {}
