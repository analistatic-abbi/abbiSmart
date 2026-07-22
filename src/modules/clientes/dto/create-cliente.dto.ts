import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateClienteDto {
  @ApiProperty({ example: 'Empresa Demo S.A.S.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  empresa: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  ubicacionId: number;

  @ApiProperty({ enum: SegmentoCliente, example: SegmentoCliente.MINERIA })
  @IsEnum(SegmentoCliente)
  segmento: SegmentoCliente;

  @ApiPropertyOptional({ example: 'Segmento personalizado' })
  @ValidateIf((dto: CreateClienteDto) => dto.segmento === SegmentoCliente.OTRO)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  segmentoOtro?: string;
}
