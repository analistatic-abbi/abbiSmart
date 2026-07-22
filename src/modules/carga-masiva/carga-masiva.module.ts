import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CargaMasivaLog } from '../../database/entities/carga-masiva-log.entity';
import { Pais } from '../../database/entities/pais.entity';
import { UbicacionGeografica } from '../../database/entities/ubicacion-geografica.entity';
import { ClientesModule } from '../clientes/clientes.module';
import { ConfiguracionModule } from '../configuracion/configuracion.module';
import { ContactosModule } from '../contactos/contactos.module';
import { ProyeccionesModule } from '../proyecciones/proyecciones.module';
import { CargaMasivaController } from './carga-masiva.controller';
import { CargaMasivaService } from './carga-masiva.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CargaMasivaLog, UbicacionGeografica, Pais]),
    ConfiguracionModule,
    ClientesModule,
    ContactosModule,
    ProyeccionesModule,
  ],
  controllers: [CargaMasivaController],
  providers: [CargaMasivaService],
})
export class CargaMasivaModule {}
