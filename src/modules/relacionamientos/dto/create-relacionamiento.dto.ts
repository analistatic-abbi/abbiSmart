import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  ValidateIf,
} from 'class-validator';
import { CanalRelacionamiento } from '../../../common/enums/canal-relacionamiento.enum';
import { ResultadoRelacionamiento } from '../../../common/enums/resultado-relacionamiento.enum';

export class CreateRelacionamientoDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  contactoId: number;

  @ApiProperty({ enum: CanalRelacionamiento })
  @IsEnum(CanalRelacionamiento)
  canal: CanalRelacionamiento;

  @ApiProperty({ example: 'Seguimiento inicial de oportunidad' })
  @IsString()
  @IsNotEmpty()
  mensaje: string;

  @ApiProperty({ example: '2026-03-15' })
  @IsDateString()
  fechaMensaje: string;

  @ApiProperty({ enum: ResultadoRelacionamiento })
  @IsEnum(ResultadoRelacionamiento)
  resultado: ResultadoRelacionamiento;

  @ApiPropertyOptional({ example: '2026-03-22' })
  @ValidateIf(
    (dto: CreateRelacionamientoDto) =>
      dto.resultado === ResultadoRelacionamiento.REUNION_PROGRAMADA,
  )
  @IsDateString()
  fechaReunion?: string;
}
