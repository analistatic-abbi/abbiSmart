import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ClienteHistorialQueryDto {
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
  @Max(100)
  limit?: number;
}

export class ClienteHistorialItemDto {
  tipo: 'proceso' | 'relacionamiento';
  entidadId: number;
  fecha: string;
  titulo: string;
  subtitulo?: string | null;
  estado?: string | null;
  contactoNombre?: string | null;
}
