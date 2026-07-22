import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { EstadoProyeccion } from '../../../common/enums/estado-proyeccion.enum';
import { MercadoProyeccion } from '../../../common/enums/mercado-proyeccion.enum';

export class ProyeccionesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: EstadoProyeccion })
  @IsOptional()
  @IsEnum(EstadoProyeccion)
  estado?: EstadoProyeccion;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anioProyectado?: number;

  @ApiPropertyOptional({ enum: MercadoProyeccion })
  @IsOptional()
  @IsEnum(MercadoProyeccion)
  mercado?: MercadoProyeccion;

  @ApiPropertyOptional({ description: 'Búsqueda por empresa o código de proceso' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Incluir registros eliminados (Admin/Supervisor)' })
  @IsOptional()
  incluirEliminados?: boolean;
}

export class CreateProyeccionDto {
  @ApiPropertyOptional({ description: 'Null para proyección manual pura (PRY-013)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  procesoOrigenId?: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  anioProyectado: number;

  @ApiProperty()
  @IsDateString()
  fechaEstimadaPublicacion: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valorVenta: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valorFacturacion: number;
}

export class UpdateProyeccionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anioProyectado?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaEstimadaPublicacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  valorVenta?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  valorFacturacion?: number;

  @ApiPropertyOptional({ enum: EstadoProyeccion })
  @IsOptional()
  @IsEnum(EstadoProyeccion)
  estado?: EstadoProyeccion;
}

export class VincularProcesoResultanteDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  procesoResultanteId: number;
}

export class AsignacionMercadoItemDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  proyeccionId: number;

  @ApiProperty({ enum: MercadoProyeccion })
  @IsEnum(MercadoProyeccion)
  mercado: MercadoProyeccion;
}

export class AsignarMercadoBatchDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  anioProyectado: number;

  @ApiProperty({ type: [AsignacionMercadoItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AsignacionMercadoItemDto)
  asignaciones: AsignacionMercadoItemDto[];
}

export class ProyeccionResponseDto {
  id: number;
  paisId: number;
  procesoOrigenId: number | null;
  procesoResultanteId: number | null;
  procesoCodigo?: string | null;
  empresa?: string | null;
  segmento?: string | null;
  anioProyectado: number;
  fechaEstimadaPublicacion: string;
  valorVenta: string;
  valorFacturacion: string;
  estado: EstadoProyeccion;
  mercado: MercadoProyeccion | null;
  fechaCreacion: Date;
  diasFaltantes?: number;
  estadoSugerido?: EstadoProyeccion;
}
