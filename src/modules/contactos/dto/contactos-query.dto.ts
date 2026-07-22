import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ContactosQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar por cliente' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  clienteId?: number;

  @ApiPropertyOptional({ description: 'Búsqueda por nombre, cargo, correo o empresa' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({ description: 'Filtrar contactos genéricos' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  esGenerico?: boolean;
}
