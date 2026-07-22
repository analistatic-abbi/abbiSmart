import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
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

  @ApiPropertyOptional({ enum: MercadoProyeccion })
  @IsOptional()
  @IsEnum(MercadoProyeccion)
  mercado?: MercadoProyeccion;
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

  @ApiPropertyOptional({ enum: MercadoProyeccion })
  @IsOptional()
  @IsEnum(MercadoProyeccion)
  mercado?: MercadoProyeccion | null;
}

export class VincularProcesoResultanteDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  procesoResultanteId: number;
}

export class ProyeccionResponseDto {
  id: number;
  procesoOrigenId: number | null;
  procesoResultanteId: number | null;
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
