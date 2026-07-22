import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePaisDto {
  @ApiProperty({ example: 'Ecuador' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
