import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePaisDto {
  @ApiPropertyOptional({ example: 'Colombia' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
