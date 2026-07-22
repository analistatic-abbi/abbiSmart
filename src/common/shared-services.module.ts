import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertaEnviada } from '../database/entities/alerta-enviada.entity';
import { Cliente } from '../database/entities/cliente.entity';
import { Contacto } from '../database/entities/contacto.entity';
import { Proceso } from '../database/entities/proceso.entity';
import { Proyeccion } from '../database/entities/proyeccion.entity';
import { ValidacionProceso } from '../database/entities/validacion-proceso.entity';
import { AlertasControlService } from './services/alertas-control.service';
import { EliminacionDependenciasService } from './services/eliminacion-dependencias.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AlertaEnviada,
      Cliente,
      Contacto,
      Proceso,
      Proyeccion,
      ValidacionProceso,
    ]),
  ],
  providers: [AlertasControlService, EliminacionDependenciasService],
  exports: [AlertasControlService, EliminacionDependenciasService],
})
export class SharedServicesModule {}
