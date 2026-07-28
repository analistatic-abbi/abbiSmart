import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class EnviarSoporteDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  categoria?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  asunto?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(8000)
  mensaje!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  paginaActual?: string;
}
