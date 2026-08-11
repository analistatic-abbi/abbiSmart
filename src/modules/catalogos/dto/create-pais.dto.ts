import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreatePaisDto {
  @ApiProperty({ example: 'EC', description: 'Código ISO 3166-1 alpha-2' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  codigoIso: string;

  @ApiPropertyOptional({ example: 'Ecuador' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
