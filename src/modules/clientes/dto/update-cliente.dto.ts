import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { SegmentoCliente } from '../../../common/enums/segmento-cliente.enum';

export class UpdateClienteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  empresa?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @IsPositive()
  ubicacionId?: number;

  @ApiPropertyOptional({ enum: SegmentoCliente })
  @IsOptional()
  @IsEnum(SegmentoCliente)
  segmento?: SegmentoCliente;

  @ApiPropertyOptional()
  @ValidateIf((dto: UpdateClienteDto) => dto.segmento === SegmentoCliente.OTRO)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  segmentoOtro?: string;
}
