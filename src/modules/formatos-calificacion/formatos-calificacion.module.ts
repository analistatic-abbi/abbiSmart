import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormatoCalificacionRango } from '../../database/entities/formato-calificacion-rango.entity';
import { FormatoCalificacion } from '../../database/entities/formato-calificacion.entity';
import { ProcesoCalificacionDetalle } from '../../database/entities/proceso-calificacion-detalle.entity';
import { ProcesoCalificacion } from '../../database/entities/proceso-calificacion.entity';
import { Proceso } from '../../database/entities/proceso.entity';
import { ParametrosModule } from '../parametros/parametros.module';
import { CatalogosModule } from '../catalogos/catalogos.module';
import {
  FormatosCalificacionController,
  ProcesoCalificacionesController,
} from './formatos-calificacion.controller';
import { FormatosCalificacionService } from './formatos-calificacion.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FormatoCalificacion,
      FormatoCalificacionRango,
      ProcesoCalificacion,
      ProcesoCalificacionDetalle,
      Proceso,
    ]),
    CatalogosModule,
    ParametrosModule,
  ],
  controllers: [FormatosCalificacionController, ProcesoCalificacionesController],
  providers: [FormatosCalificacionService],
  exports: [FormatosCalificacionService],
})
export class FormatosCalificacionModule {}
