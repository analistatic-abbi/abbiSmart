import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { CanalRelacionamiento } from '../../../common/enums/canal-relacionamiento.enum';
import { ResultadoRelacionamiento } from '../../../common/enums/resultado-relacionamiento.enum';

export class RelacionamientosQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  contactoId?: number;

  @ApiPropertyOptional({ enum: CanalRelacionamiento })
  @IsOptional()
  @IsEnum(CanalRelacionamiento)
  canal?: CanalRelacionamiento;

  @ApiPropertyOptional({ enum: ResultadoRelacionamiento })
  @IsOptional()
  @IsEnum(ResultadoRelacionamiento)
  resultado?: ResultadoRelacionamiento;

  @ApiPropertyOptional({ description: 'Búsqueda en mensaje o respuesta' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;
}

export class RelacionamientoResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  contactoId: number;

  @ApiProperty()
  emisorUsuarioId: number;

  @ApiProperty({ enum: CanalRelacionamiento })
  canal: CanalRelacionamiento;

  @ApiProperty()
  mensaje: string;

  @ApiProperty()
  fechaMensaje: string;

  @ApiPropertyOptional()
  respuesta: string | null;

  @ApiPropertyOptional()
  fechaRespuesta: string | null;

  @ApiProperty({ enum: ResultadoRelacionamiento })
  resultado: ResultadoRelacionamiento;

  @ApiPropertyOptional()
  fechaReunion: string | null;
}

export class RelacionamientoVencidoResponseDto extends RelacionamientoResponseDto {
  @ApiProperty()
  diasEsperaConfigurado: number;

  @ApiProperty()
  fechaLimiteRespuesta: string;
}
