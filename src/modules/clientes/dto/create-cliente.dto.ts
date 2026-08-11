import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class CreateClienteDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  empresa: string;

  @ApiProperty()
  @IsInt()
  ubicacionId: number;

  @ApiProperty({ example: 'Minería' })
  @IsString()
  @MaxLength(100)
  segmento: string;

  @ApiPropertyOptional()
  @ValidateIf((dto: CreateClienteDto) => dto.segmento === 'Otro')
  @IsString()
  @MaxLength(255)
  segmentoOtro?: string;
}
