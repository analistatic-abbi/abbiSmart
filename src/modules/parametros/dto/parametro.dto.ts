import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { INDICADORES_FINANCIEROS } from '../../../common/enums/indicador-codigo.enum';
import { IndicadorCodigo } from '../../../common/enums/indicador-codigo.enum';

export class ParametrosQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: IndicadorCodigo })
  @IsOptional()
  @IsEnum(IndicadorCodigo)
  indicadorCodigo?: IndicadorCodigo;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  anio?: number;

  @ApiPropertyOptional({ description: 'Búsqueda por código de indicador o año' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;
}

export class CreateParametroDto {
  @ApiProperty()
  @IsString()
  @MaxLength(50)
  indicadorCodigo: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  anio: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  valor: number;

  @ApiProperty({ enum: ['Mayor o igual al requerido', 'Menor o igual al requerido'] })
  @IsEnum(['Mayor o igual al requerido', 'Menor o igual al requerido'] as const)
  reglaCumplimiento: 'Mayor o igual al requerido' | 'Menor o igual al requerido';
}

export class UpdateParametroDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  valor?: number;

  @ApiPropertyOptional({ enum: ['Mayor o igual al requerido', 'Menor o igual al requerido'] })
  @IsOptional()
  @IsEnum(['Mayor o igual al requerido', 'Menor o igual al requerido'] as const)
  reglaCumplimiento?: 'Mayor o igual al requerido' | 'Menor o igual al requerido';
}

export class ParametroResponseDto {
  id: number;
  paisId: number;
  indicadorCodigo: string;
  anio: number;
  valor: string;
  reglaCumplimiento: string;
  usuarioModificoId: number;
  fechaModificacion: Date;
}

export class ParametroPorAnioItemDto {
  @ApiProperty()
  @IsString()
  @MaxLength(50)
  indicadorCodigo: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  valor: number;

  @ApiProperty({ enum: ['Mayor o igual al requerido', 'Menor o igual al requerido'] })
  @IsEnum(['Mayor o igual al requerido', 'Menor o igual al requerido'] as const)
  reglaCumplimiento: 'Mayor o igual al requerido' | 'Menor o igual al requerido';
}

export class UpsertParametrosPorAnioDto {
  @ApiProperty({ type: [ParametroPorAnioItemDto], description: 'Hasta 8 indicadores del año' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(INDICADORES_FINANCIEROS.length)
  @ValidateNested({ each: true })
  @Type(() => ParametroPorAnioItemDto)
  indicadores: ParametroPorAnioItemDto[];
}

export class ParametroPorAnioResponseItemDto {
  indicadorCodigo: string;
  id: number | null;
  valor: string | null;
  reglaCumplimiento: string | null;
  fechaModificacion: Date | null;
}

export class ParametrosPorAnioResponseDto {
  anio: number;
  indicadores: ParametroPorAnioResponseItemDto[];
  propagacion?: ParametrosPropagacionDto;
}

export class ParametrosPropagacionDto {
  indicadoresActualizados: number;
  calificacionesActualizadas: number;
  calificacionesOmitidas: number;
}
