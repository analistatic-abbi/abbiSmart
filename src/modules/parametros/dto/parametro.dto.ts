import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
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
}

export class CreateParametroDto {
  @ApiProperty({ enum: IndicadorCodigo })
  @IsEnum(IndicadorCodigo)
  indicadorCodigo: IndicadorCodigo;

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
  indicadorCodigo: IndicadorCodigo;
  anio: number;
  valor: string;
  reglaCumplimiento: string;
  usuarioModificoId: number;
  fechaModificacion: Date;
}
