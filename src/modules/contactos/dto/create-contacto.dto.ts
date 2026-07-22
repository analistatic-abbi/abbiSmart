import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateContactoDto {
  @ApiProperty({ example: 'María López' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nombre: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  ubicacionId: number;

  @ApiPropertyOptional({ example: 'Gerente Comercial' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  cargo?: string;

  @ApiPropertyOptional({ example: '+57 300 123 4567' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  telefono?: string;

  @ApiPropertyOptional({ example: 'maria@empresa.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  correo?: string;

  @ApiPropertyOptional({ description: 'ID del contacto que refirió' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  referidoPorContactoId?: number;
}
