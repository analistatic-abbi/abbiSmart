import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pais } from '../../database/entities/pais.entity';
import { UbicacionGeografica } from '../../database/entities/ubicacion-geografica.entity';
import { CatalogosController } from './catalogos.controller';
import { CatalogosService } from './catalogos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Pais, UbicacionGeografica])],
  controllers: [CatalogosController],
  providers: [CatalogosService],
  exports: [CatalogosService],
})
export class CatalogosModule {}
