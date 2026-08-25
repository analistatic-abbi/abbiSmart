import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';
import {
  DashboardProyeccionesDto,
  DashboardResumenDto,
} from '../dashboard.service';

export class AnaliticaQueryDto {
  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  anio?: number;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  desde?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  hasta?: string;
}

export interface AnaliticaKpisDto {
  procesosActivos: number;
  proyeccionesActivas: number;
  cierresProximos30Dias: number;
  validacionesPendientes: number;
  relacionamientosVencidos: number;
  clientesActivos: number;
  contactosActivos: number;
  relacionamientosTotal: number;
  reunionesProgramadas: number;
}

export interface AnaliticaConteoDto {
  etiqueta: string;
  total: number;
}

export interface AnaliticaEmbudoEtapaDto {
  etapa: string;
  clave: string;
  total: number;
}

export interface AnaliticaCierresVentanaDto {
  ventana: string;
  label: string;
  total: number;
}

export interface AnaliticaEfectividadMercadoResumenDto {
  pctGanadasDeMaterializadas: number | null;
  materializadas: number;
  ganadas: number;
}

export interface AnaliticaEfectividadResumenDto {
  anio: number;
  general: AnaliticaEfectividadMercadoResumenDto;
  objetivo: AnaliticaEfectividadMercadoResumenDto;
}

export interface AnaliticaProyeccionEstadoMercadoDto {
  estado: string;
  general: number;
  objetivo: number;
}

export interface AnaliticaCrmDto {
  porCanal: AnaliticaConteoDto[];
  porResultado: AnaliticaConteoDto[];
  porSegmentoCliente: AnaliticaConteoDto[];
  estadoRespuesta: AnaliticaConteoDto[];
  actividadPorVentana: AnaliticaCierresVentanaDto[];
}

export interface AnaliticaGaugesMontosDto {
  adjudicacion: string;
  facturacion: string;
}

export interface AnaliticaGaugesDto {
  metaAdjudicacion: string | null;
  metaFacturacion: string | null;
  real: AnaliticaGaugesMontosDto;
  proyectada: AnaliticaGaugesMontosDto;
}

export interface AnaliticaDashboardDto {
  anio: number;
  kpis: AnaliticaKpisDto;
  resumen: DashboardResumenDto;
  proyecciones: DashboardProyeccionesDto;
  gauges: AnaliticaGaugesDto;
  embudo: AnaliticaEmbudoEtapaDto[];
  cierresPorVentana: AnaliticaCierresVentanaDto[];
  proyeccionesPorEstadoMercado: AnaliticaProyeccionEstadoMercadoDto[];
  efectividadMercado: AnaliticaEfectividadResumenDto;
  crm: AnaliticaCrmDto;
}
