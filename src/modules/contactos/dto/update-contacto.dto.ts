import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateContactoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @IsPositive()
  ubicacionId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  cargo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  telefono?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  correo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @IsPositive()
  referidoPorContactoId?: number;
}
