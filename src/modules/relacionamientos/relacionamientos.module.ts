import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Relacionamiento } from '../../database/entities/relacionamiento.entity';
import { ContactosModule } from '../contactos/contactos.module';
import { RelacionamientosController } from './relacionamientos.controller';
import { RelacionamientosService } from './relacionamientos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Relacionamiento]), ContactosModule],
  controllers: [RelacionamientosController],
  providers: [RelacionamientosService],
  exports: [RelacionamientosService],
})
export class RelacionamientosModule {}
