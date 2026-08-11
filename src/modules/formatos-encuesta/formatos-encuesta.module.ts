import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormatoEncuestaItem } from '../../database/entities/formato-encuesta-item.entity';
import { FormatoEncuestaPregunta } from '../../database/entities/formato-encuesta-pregunta.entity';
import { FormatoEncuestaSeccion } from '../../database/entities/formato-encuesta-seccion.entity';
import { FormatoEncuesta } from '../../database/entities/formato-encuesta.entity';
import { KamEncuesta } from '../../database/entities/kam-encuesta.entity';
import { AuditModule } from '../audit/audit.module';
import { FormatosEncuestaController } from './formatos-encuesta.controller';
import { FormatosEncuestaService } from './formatos-encuesta.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FormatoEncuesta,
      FormatoEncuestaSeccion,
      FormatoEncuestaPregunta,
      FormatoEncuestaItem,
      KamEncuesta,
    ]),
    AuditModule,
  ],
  controllers: [FormatosEncuestaController],
  providers: [FormatosEncuestaService],
  exports: [FormatosEncuestaService],
})
export class FormatosEncuestaModule {}
