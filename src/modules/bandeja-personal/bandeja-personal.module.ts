import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Proceso } from '../../database/entities/proceso.entity';
import { Proyeccion } from '../../database/entities/proyeccion.entity';
import { Relacionamiento } from '../../database/entities/relacionamiento.entity';
import { UsuarioFijacion } from '../../database/entities/usuario-fijacion.entity';
import { BandejaPersonalController } from './bandeja-personal.controller';
import { BandejaPersonalService } from './bandeja-personal.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UsuarioFijacion,
      Proceso,
      Proyeccion,
      Relacionamiento,
    ]),
  ],
  controllers: [BandejaPersonalController],
  providers: [BandejaPersonalService],
})
export class BandejaPersonalModule {}
