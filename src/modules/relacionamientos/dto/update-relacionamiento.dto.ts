import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { CanalRelacionamiento } from '../../../common/enums/canal-relacionamiento.enum';
import { ResultadoRelacionamiento } from '../../../common/enums/resultado-relacionamiento.enum';

export class UpdateRelacionamientoDto {
  @ApiPropertyOptional({ enum: CanalRelacionamiento })
  @IsOptional()
  @IsEnum(CanalRelacionamiento)
  canal?: CanalRelacionamiento;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mensaje?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaMensaje?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  respuesta?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaRespuesta?: string;

  @ApiPropertyOptional({ enum: ResultadoRelacionamiento })
  @IsOptional()
  @IsEnum(ResultadoRelacionamiento)
  resultado?: ResultadoRelacionamiento;

  @ApiPropertyOptional()
  @ValidateIf(
    (dto: UpdateRelacionamientoDto) =>
      dto.resultado === ResultadoRelacionamiento.REUNION_PROGRAMADA,
  )
  @IsDateString()
  fechaReunion?: string;
}
