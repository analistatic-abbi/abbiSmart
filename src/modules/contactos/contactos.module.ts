import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contacto } from '../../database/entities/contacto.entity';
import { ClientesModule } from '../clientes/clientes.module';
import { ContactosController } from './contactos.controller';
import { ContactosService } from './contactos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Contacto]), ClientesModule],
  controllers: [ContactosController],
  providers: [ContactosService],
  exports: [ContactosService],
})
export class ContactosModule {}
