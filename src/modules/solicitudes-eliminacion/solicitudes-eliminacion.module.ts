import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SolicitudEliminacion } from '../../database/entities/solicitud-eliminacion.entity';
import { AuditModule } from '../audit/audit.module';
import { ClientesModule } from '../clientes/clientes.module';
import { ProcesosModule } from '../procesos/procesos.module';
import { SolicitudesEliminacionController } from './solicitudes-eliminacion.controller';
import { SolicitudesEliminacionService } from './solicitudes-eliminacion.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SolicitudEliminacion]),
    ProcesosModule,
    ClientesModule,
    AuditModule,
  ],
  controllers: [SolicitudesEliminacionController],
  providers: [SolicitudesEliminacionService],
})
export class SolicitudesEliminacionModule {}
