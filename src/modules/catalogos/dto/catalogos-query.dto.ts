import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';

export class PaisesQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar por estado activo/inactivo' })
  @IsOptional()
  @Type(() => Boolean)
  activo?: boolean;
}

export class UbicacionesQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar por país (por defecto: país de sesión)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  paisId?: number;

  @ApiPropertyOptional({ description: 'Filtrar por departamento/provincia (coincidencia exacta)' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  departamento?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export class DepartamentosQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar por país (por defecto: país de sesión)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  paisId?: number;
}
