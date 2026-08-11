import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormatoCalificacion } from '../../database/entities/formato-calificacion.entity';
import { ProcesoCalificacion } from '../../database/entities/proceso-calificacion.entity';
import { ProcesoIndicador } from '../../database/entities/proceso-indicador.entity';
import { ParametroFinanciero } from '../../database/entities/parametro-financiero.entity';
import { AuditModule } from '../audit/audit.module';
import { CatalogosModule } from '../catalogos/catalogos.module';
import { ConfiguracionModule } from '../configuracion/configuracion.module';
import { ParametrosDependientesService } from './parametros-dependientes.service';
import { ParametrosController } from './parametros.controller';
import { ParametrosService } from './parametros.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ParametroFinanciero,
      ProcesoIndicador,
      ProcesoCalificacion,
      FormatoCalificacion,
    ]),
    AuditModule,
    CatalogosModule,
    ConfiguracionModule,
  ],
  controllers: [ParametrosController],
  providers: [ParametrosService, ParametrosDependientesService],
  exports: [ParametrosService],
})
export class ParametrosModule {}
