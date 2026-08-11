import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { CatalogoPaisTipo } from '../../../common/enums/catalogo-pais-tipo.enum';

export class CatalogoQueryDto {
  @ApiProperty({ enum: CatalogoPaisTipo })
  @IsEnum(CatalogoPaisTipo)
  tipo: CatalogoPaisTipo;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  soloActivos?: boolean;
}

export class CreateCatalogoPaisDto {
  @ApiProperty({ enum: CatalogoPaisTipo })
  @IsEnum(CatalogoPaisTipo)
  tipo: CatalogoPaisTipo;

  @ApiPropertyOptional({ description: 'Se genera automáticamente si no se envía' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  codigo?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  etiqueta: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  orden?: number;
}

export class UpdateCatalogoPaisDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  etiqueta?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  orden?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class ClonarConfigPaisDto {
  @ApiProperty({ description: 'ID del país origen (plantilla)' })
  @IsInt()
  paisOrigenId: number;
}
