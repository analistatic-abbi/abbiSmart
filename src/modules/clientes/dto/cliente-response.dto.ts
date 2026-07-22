import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SegmentoCliente } from '../../../common/enums/segmento-cliente.enum';

export class ClienteResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  empresa: string;

  @ApiProperty()
  paisId: number;

  @ApiProperty()
  ubicacionId: number;

  @ApiProperty({ enum: SegmentoCliente })
  segmento: SegmentoCliente;

  @ApiPropertyOptional()
  segmentoOtro: string | null;

  @ApiProperty()
  fechaCreacion: Date;
}
