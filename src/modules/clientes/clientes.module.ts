import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cliente } from '../../database/entities/cliente.entity';
import { Contacto } from '../../database/entities/contacto.entity';
import { Proceso } from '../../database/entities/proceso.entity';
import { UbicacionGeografica } from '../../database/entities/ubicacion-geografica.entity';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cliente, Contacto, Proceso, UbicacionGeografica]),
  ],
  controllers: [ClientesController],
  providers: [ClientesService],
  exports: [ClientesService],
})
export class ClientesModule {}
