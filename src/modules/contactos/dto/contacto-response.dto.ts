import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContactoResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  clienteId: number;

  @ApiProperty()
  nombre: string;

  @ApiPropertyOptional()
  cargo: string | null;

  @ApiPropertyOptional()
  telefono: string | null;

  @ApiPropertyOptional()
  correo: string | null;

  @ApiProperty()
  ubicacionId: number;

  @ApiProperty()
  esGenerico: boolean;

  @ApiPropertyOptional()
  referidoPorContactoId: number | null;

  @ApiProperty()
  fechaCreacion: Date;
}
