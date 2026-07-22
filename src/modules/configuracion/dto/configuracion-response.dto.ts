import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConfiguracionResponseDto {
  @ApiProperty()
  clave: string;

  @ApiProperty()
  valor: string;

  @ApiPropertyOptional()
  descripcion: string | null;

  @ApiPropertyOptional()
  usuarioModificoId: number | null;

  @ApiProperty()
  fechaModificacion: Date;
}
