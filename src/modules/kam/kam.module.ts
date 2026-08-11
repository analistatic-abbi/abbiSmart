import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../../common/authorization.module';
import { FormatoEncuestaItem } from '../../database/entities/formato-encuesta-item.entity';
import { FormatoEncuestaSeccion } from '../../database/entities/formato-encuesta-seccion.entity';
import { FormatoEncuesta } from '../../database/entities/formato-encuesta.entity';
import { KamEncuestaContacto } from '../../database/entities/kam-encuesta-contacto.entity';
import { KamEncuestaRespuesta } from '../../database/entities/kam-encuesta-respuesta.entity';
import { KamEncuesta } from '../../database/entities/kam-encuesta.entity';
import { KamRondaBitacora } from '../../database/entities/kam-ronda-bitacora.entity';
import { KamRondaCorrespondencia } from '../../database/entities/kam-ronda-correspondencia.entity';
import { KamRonda } from '../../database/entities/kam-ronda.entity';
import { Kam } from '../../database/entities/kam.entity';
import { ProcesoContacto } from '../../database/entities/proceso-contacto.entity';
import { Proceso } from '../../database/entities/proceso.entity';
import { AuditModule } from '../audit/audit.module';
import { KamController } from './kam.controller';
import { KamService } from './kam.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Kam,
      KamRonda,
      KamRondaCorrespondencia,
      KamRondaBitacora,
      KamEncuesta,
      KamEncuestaContacto,
      KamEncuestaRespuesta,
      Proceso,
      ProcesoContacto,
      FormatoEncuesta,
      FormatoEncuestaSeccion,
      FormatoEncuestaItem,
    ]),
    AuditModule,
    AuthorizationModule,
  ],
  controllers: [KamController],
  providers: [KamService],
  exports: [KamService],
})
export class KamModule {}
