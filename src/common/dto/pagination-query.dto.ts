import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { FiltroEliminados } from '../enums/filtro-eliminados.enum';
import { SegmentoCliente } from '../enums/segmento-cliente.enum';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export class ClientesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Búsqueda por nombre de empresa' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({ enum: SegmentoCliente })
  @IsOptional()
  @IsEnum(SegmentoCliente)
  segmento?: SegmentoCliente;

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
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  incluirEliminados?: boolean;
}
