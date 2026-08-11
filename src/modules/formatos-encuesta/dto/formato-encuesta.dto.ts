import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class FormatosEncuestaQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  soloActivos?: boolean;
}

export class FormatoEncuestaItemInputDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orden: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  subseccion?: string | null;

  @ApiProperty()
  @IsBoolean()
  requiereCalificacion: boolean;
}

export class FormatoEncuestaPreguntaInputDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orden: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  texto: string;

  @ApiProperty({ type: [FormatoEncuestaItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FormatoEncuestaItemInputDto)
  items: FormatoEncuestaItemInputDto[];
}

export class FormatoEncuestaSeccionInputDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orden: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  titulo: string;

  @ApiProperty({ type: [FormatoEncuestaPreguntaInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FormatoEncuestaPreguntaInputDto)
  preguntas: FormatoEncuestaPreguntaInputDto[];
}

export class CreateFormatoEncuestaDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre: string;

  @ApiPropertyOptional({ type: [FormatoEncuestaSeccionInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormatoEncuestaSeccionInputDto)
  secciones?: FormatoEncuestaSeccionInputDto[];

  /** Compatibilidad: lista plana → Sección 1 con ítems calificables */
  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  preguntas?: Array<{ orden: number; texto: string }>;
}

export class UpdateFormatoEncuestaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class UpdateFormatoEncuestaEstructuraDto {
  @ApiProperty({ type: [FormatoEncuestaSeccionInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FormatoEncuestaSeccionInputDto)
  secciones: FormatoEncuestaSeccionInputDto[];
}

/** Compatibilidad: lista plana de preguntas */
export class UpdateFormatoEncuestaPreguntasDto {
  @ApiProperty({ type: [Object] })
  @IsArray()
  @ArrayMinSize(1)
  preguntas: Array<{ orden: number; texto: string }>;
}

export class ClonarFormatoEncuestaDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre: string;

  @ApiPropertyOptional({ type: [FormatoEncuestaSeccionInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormatoEncuestaSeccionInputDto)
  secciones?: FormatoEncuestaSeccionInputDto[];
}

export class ImportFormatoEncuestaDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre: string;
}

export class FormatoEncuestaItemResponseDto {
  id: number;
  orden: number;
  subseccion: string | null;
  requiereCalificacion: boolean;
}

export class FormatoEncuestaPreguntaResponseDto {
  id: number;
  orden: number;
  texto: string;
  items: FormatoEncuestaItemResponseDto[];
}

export class FormatoEncuestaSeccionResponseDto {
  id: number;
  orden: number;
  titulo: string;
  preguntas: FormatoEncuestaPreguntaResponseDto[];
}

export class FormatoEncuestaListItemDto {
  id: number;
  nombre: string;
  activo: boolean;
  cantidadPreguntas: number;
  cantidadItems: number;
  fechaCreacion: string;
}

export class FormatoEncuestaDetailDto {
  id: number;
  nombre: string;
  activo: boolean;
  clonadoDeId: number | null;
  fechaCreacion: string;
  secciones: FormatoEncuestaSeccionResponseDto[];
  /** Flatten de ítems para pantallas que aún esperan lista simple */
  preguntas: Array<{ id: number; orden: number; texto: string }>;
  enUso: boolean;
}
