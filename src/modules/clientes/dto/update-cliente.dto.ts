import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class UpdateClienteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  empresa?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  ubicacionId?: number;

  @ApiPropertyOptional({ example: 'Minería' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  segmento?: string;

  @ApiPropertyOptional()
  @ValidateIf((dto: UpdateClienteDto) => dto.segmento === 'Otro')
  @IsOptional()
  @IsString()
  @MaxLength(255)
  segmentoOtro?: string;
}
