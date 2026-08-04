import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMinSize,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { IndicadorCodigo } from '../../../common/enums/indicador-codigo.enum';
import { ResultadoCalificacion } from '../../../common/enums/resultado-calificacion.enum';

export class FormatosCalificacionQueryDto {
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  soloActivos?: boolean;
}

export class FormatoCalificacionRangoResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: IndicadorCodigo })
  indicadorCodigo: IndicadorCodigo;

  @ApiProperty()
  orden: number;

  @ApiPropertyOptional()
  rangoMin: string | null;

  @ApiPropertyOptional()
  rangoMax: string | null;

  @ApiProperty()
  puntos: number;
}

export class FormatoCalificacionListItemDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  puntajeMinimo: number;

  @ApiProperty()
  activo: boolean;

  @ApiProperty()
  cantidadIndicadores: number;

  @ApiProperty()
  fechaCreacion: string;
}

export class FormatoCalificacionDetailDto extends FormatoCalificacionListItemDto {
  @ApiProperty({ type: [FormatoCalificacionRangoResponseDto] })
  rangos: FormatoCalificacionRangoResponseDto[];
}

export class EvaluarCalificacionesDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((id) => Number(id)) : value,
  )
  @IsInt({ each: true })
  formatoIds: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === '' ? undefined : Number(value)))
  @IsInt()
  @Min(2000)
  anioParametros?: number;
}

export class ProcesoCalificacionDetalleResponseDto {
  @ApiProperty({ enum: IndicadorCodigo })
  indicadorCodigo: IndicadorCodigo;

  @ApiProperty()
  parametroFinancieroId: number;

  @ApiProperty()
  valorAbbi: string;

  @ApiPropertyOptional()
  rangoMin: string | null;

  @ApiPropertyOptional()
  rangoMax: string | null;

  @ApiProperty()
  puntosObtenidos: number;
}

export class ProcesoCalificacionResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  formatoCalificacionId: number;

  @ApiProperty()
  formatoNombre: string;

  @ApiProperty()
  anioParametros: number;

  @ApiProperty()
  puntajeTotal: number;

  @ApiProperty()
  puntajeMinimo: number;

  @ApiProperty({ enum: ResultadoCalificacion })
  resultado: ResultadoCalificacion;

  @ApiProperty()
  fechaEvaluacion: string;

  @ApiProperty({ type: [ProcesoCalificacionDetalleResponseDto] })
  detalle: ProcesoCalificacionDetalleResponseDto[];
}

export class ImportFormatoCalificacionDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  nombre: string;

  @ApiProperty()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  puntajeMinimo: number;
}
