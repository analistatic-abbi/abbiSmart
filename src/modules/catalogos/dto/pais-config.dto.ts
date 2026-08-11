import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateConfiguracionPaisDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  valor: string;
}

export class CreatePlantillaTareaDto {
  @ApiProperty({ example: 'Revisión legal preliminar' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre: string;

  @ApiPropertyOptional({ example: 13 })
  @IsOptional()
  @IsInt()
  @Min(1)
  orden?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  aplicaRfi?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiereFechaAdquisicion?: boolean;
}

export class UpdatePlantillaTareaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  orden?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  aplicaRfi?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiereFechaAdquisicion?: boolean;
}
