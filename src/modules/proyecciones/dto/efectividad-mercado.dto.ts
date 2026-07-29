import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';
import { MercadoProyeccion } from '../../../common/enums/mercado-proyeccion.enum';

export class EfectividadMercadoQueryDto {
  @ApiProperty({ example: 2025 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  anio: number;
}

export class EfectividadMercadoMercadoDto {
  total: number;
  pendientes: number;
  resueltas: number;
  nuncaMaterializadas: number;
  materializadasNoGanadas: number;
  ganadas: number;
  materializadas: number;
  pctNuncaMaterializadas: number | null;
  pctMaterializadasNoGanadas: number | null;
  pctGanadas: number | null;
  pctGanadasDeMaterializadas: number | null;
}

export class EfectividadMercadoReporteDto {
  anio: number;
  sinMercado: number;
  inconsistencias: number;
  general: EfectividadMercadoMercadoDto;
  objetivo: EfectividadMercadoMercadoDto;
}

export interface EfectividadMercadoRowRaw {
  mercado: MercadoProyeccion;
  total: number;
  ganadas: number;
  materializadasNoGanadas: number;
  nuncaMaterializadas: number;
  pendientes: number;
}

export interface EfectividadMercadoConteosRaw {
  nuncaMaterializadas: number;
  materializadasNoGanadas: number;
  ganadas: number;
  pendientes: number;
}
