import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class SimilaresQueryDto {
  @ApiPropertyOptional({ description: 'Texto a comparar (mínimo 3 caracteres)' })
  @IsString()
  @MinLength(3)
  q: string;

  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number;
}

export class ContactoSimilaresQueryDto extends SimilaresQueryDto {
  @ApiPropertyOptional({ description: 'Limitar búsqueda a un cliente' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  clienteId?: number;
}

export class SimilarEntityDto {
  id: number;
  nombre: string;
  similitud: number;
  clienteNombre?: string | null;
}
