import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../../common/authorization.module';
import { Pais } from '../../database/entities/pais.entity';
import { ProcesoComentario } from '../../database/entities/proceso-comentario.entity';
import { ProcesoContacto } from '../../database/entities/proceso-contacto.entity';
import { ProcesoIndicador } from '../../database/entities/proceso-indicador.entity';
import { ProcesoTarea } from '../../database/entities/proceso-tarea.entity';
import { Proceso } from '../../database/entities/proceso.entity';
import { ValidacionProceso } from '../../database/entities/validacion-proceso.entity';
import { AuditModule } from '../audit/audit.module';
import { CatalogosModule } from '../catalogos/catalogos.module';
import { ClientesModule } from '../clientes/clientes.module';
import { ContactosModule } from '../contactos/contactos.module';
import { ConfiguracionModule } from '../configuracion/configuracion.module';
import { ParametrosModule } from '../parametros/parametros.module';
import { ProyeccionesModule } from '../proyecciones/proyecciones.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { KamModule } from '../kam/kam.module';
import { ProcesosController } from './procesos.controller';
import { ProcesosService } from './procesos.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Proceso,
      ProcesoIndicador,
      ProcesoContacto,
      ProcesoTarea,
      ProcesoComentario,
      Pais,
      ValidacionProceso,
    ]),
    AuditModule,
    CatalogosModule,
    ClientesModule,
    ContactosModule,
    ConfiguracionModule,
    ParametrosModule,
    AuthorizationModule,
    forwardRef(() => ProyeccionesModule),
    KamModule,
    NotificacionesModule,
  ],
  controllers: [ProcesosController],
  providers: [ProcesosService],
  exports: [ProcesosService],
})
export class ProcesosModule {}
