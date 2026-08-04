import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class DashboardProcesosQueryDto {
  @ApiPropertyOptional({ description: 'Búsqueda por ID digitado' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtro fecha cierre desde (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  fechaCierreDesde?: string;

  @ApiPropertyOptional({ description: 'Filtro fecha cierre hasta (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  fechaCierreHasta?: string;
}

export class DashboardProyeccionesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anio?: number;
}

export class DashboardExportQueryDto extends DashboardProcesosQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anio?: number;
}
