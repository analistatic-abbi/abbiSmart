import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogoPais } from '../../database/entities/catalogo-pais.entity';
import { Cliente } from '../../database/entities/cliente.entity';
import { ConfiguracionPais } from '../../database/entities/configuracion-pais.entity';
import { ParametroFinanciero } from '../../database/entities/parametro-financiero.entity';
import { Pais } from '../../database/entities/pais.entity';
import { PlantillaTareaPais } from '../../database/entities/plantilla-tarea-pais.entity';
import { Proceso } from '../../database/entities/proceso.entity';
import { Proyeccion } from '../../database/entities/proyeccion.entity';
import { UbicacionGeografica } from '../../database/entities/ubicacion-geografica.entity';
import { AuditModule } from '../audit/audit.module';
import { ConfiguracionModule } from '../configuracion/configuracion.module';
import { CatalogoPaisService } from './catalogo-pais.service';
import { CatalogosController } from './catalogos.controller';
import { CatalogosService } from './catalogos.service';
import { PaisConfigService } from './pais-config.service';
import { PaisOnboardingService } from './pais-onboarding.service';
import { UbicacionesSeederService } from './ubicaciones-seeder.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Pais,
      UbicacionGeografica,
      ConfiguracionPais,
      PlantillaTareaPais,
      ParametroFinanciero,
      CatalogoPais,
      Proceso,
      Cliente,
      Proyeccion,
    ]),
    ConfiguracionModule,
    AuditModule,
  ],
  controllers: [CatalogosController],
  providers: [
    CatalogosService,
    UbicacionesSeederService,
    PaisConfigService,
    PaisOnboardingService,
    CatalogoPaisService,
  ],
  exports: [CatalogosService, PaisConfigService, CatalogoPaisService],
})
export class CatalogosModule {}
