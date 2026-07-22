import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../../common/authorization.module';
import { Pais } from '../../database/entities/pais.entity';
import { ProcesoIndicador } from '../../database/entities/proceso-indicador.entity';
import { ProcesoTarea } from '../../database/entities/proceso-tarea.entity';
import { Proceso } from '../../database/entities/proceso.entity';
import { AuditModule } from '../audit/audit.module';
import { ClientesModule } from '../clientes/clientes.module';
import { ParametrosModule } from '../parametros/parametros.module';
import { ProyeccionesModule } from '../proyecciones/proyecciones.module';
import { ProcesosController } from './procesos.controller';
import { ProcesosService } from './procesos.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Proceso,
      ProcesoIndicador,
      ProcesoTarea,
      Pais,
    ]),
    AuditModule,
    ClientesModule,
    ParametrosModule,
    AuthorizationModule,
    forwardRef(() => ProyeccionesModule),
  ],
  controllers: [ProcesosController],
  providers: [ProcesosService],
  exports: [ProcesosService],
})
export class ProcesosModule {}
