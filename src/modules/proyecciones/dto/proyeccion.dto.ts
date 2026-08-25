import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { EstadoProyeccion } from '../../../common/enums/estado-proyeccion.enum';
import { FiltroEliminados } from '../../../common/enums/filtro-eliminados.enum';
import { MercadoProyeccion } from '../../../common/enums/mercado-proyeccion.enum';
import { SegmentoProceso } from '../../../common/enums/segmento-proceso.enum';

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

  @ApiPropertyOptional({ description: 'Búsqueda por código o ID digitado de proceso' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtrar por empresa (cliente registrado)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  empresaClienteId?: number;

  @ApiPropertyOptional({ description: 'Filtrar por proceso origen (1:1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  procesoOrigenId?: number;

  @ApiPropertyOptional({
    enum: FiltroEliminados,
    default: FiltroEliminados.ACTIVOS,
    description: 'activos | todos | solo_eliminados (Admin/Supervisor)',
  })
  @IsOptional()
  @IsEnum(FiltroEliminados)
  filtroEliminados?: FiltroEliminados;

  @ApiPropertyOptional({ description: 'Deprecated: use filtroEliminados=todos' })
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

  @ApiPropertyOptional({ description: 'Obligatorio en proyección manual sin proceso origen' })
  @ValidateIf((dto: CreateProyeccionDto) => !dto.procesoOrigenId && !dto.empresaOtro)
  @Type(() => Number)
  @IsInt()
  empresaClienteId?: number;

  @ApiPropertyOptional({ description: 'Obligatorio en proyección manual sin proceso origen' })
  @ValidateIf((dto: CreateProyeccionDto) => !dto.procesoOrigenId && !dto.empresaClienteId)
  @IsString()
  @MaxLength(255)
  empresaOtro?: string;

  @ApiPropertyOptional({ description: 'Obligatorio en proyección manual' })
  @ValidateIf((dto: CreateProyeccionDto) => !dto.procesoOrigenId)
  @IsString()
  @MaxLength(100)
  segmento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  objeto?: string;
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

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  empresaClienteId?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  empresaOtro?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  segmento?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  objeto?: string | null;
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
  procesoOrigenCodigo?: string | null;
  procesoResultanteCodigo?: string | null;
  proyeccionSiguienteId?: number | null;
  empresa?: string | null;
  empresaClienteId?: number | null;
  empresaOtro?: string | null;
  segmento?: string | null;
  objeto?: string | null;
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
