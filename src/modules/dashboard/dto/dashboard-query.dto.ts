import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class DashboardProcesosQueryDto {
  @ApiPropertyOptional({ description: 'Búsqueda por código, ID digitado o empresa' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class DashboardProyeccionesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anio?: number;
}
