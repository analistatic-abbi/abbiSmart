import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Proceso } from '../../database/entities/proceso.entity';
import { Proyeccion } from '../../database/entities/proyeccion.entity';
import { Relacionamiento } from '../../database/entities/relacionamiento.entity';
import { CalendarioController } from './calendario.controller';
import { CalendarioService } from './calendario.service';

@Module({
  imports: [TypeOrmModule.forFeature([Proyeccion, Proceso, Relacionamiento])],
  controllers: [CalendarioController],
  providers: [CalendarioService],
})
export class CalendarioModule {}
