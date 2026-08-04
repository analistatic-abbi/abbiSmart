import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export enum CalendarioEventoTipo {
  PROYECCION = 'proyeccion',
  PROCESO = 'proceso',
  RELACIONAMIENTO = 'relacionamiento',
}

export class CalendarioEventosQueryDto {
  @ApiProperty({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  anio: number;

  @ApiPropertyOptional({
    description: 'Tipos separados por coma: proyeccion,proceso,relacionamiento',
    example: 'proyeccion,proceso,relacionamiento',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return value;
  })
  @IsArray()
  @IsEnum(CalendarioEventoTipo, { each: true })
  tipos?: CalendarioEventoTipo[];
}

export class CalendarioEventoDto {
  id: number;
  tipo: CalendarioEventoTipo;
  fecha: string;
  titulo: string;
  subtitulo?: string | null;
  empresa?: string | null;
  objeto?: string | null;
  valor?: string | null;
  estado: string;
  icono: string;
}
