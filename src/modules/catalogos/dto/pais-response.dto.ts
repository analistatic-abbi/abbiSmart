import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaisResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  nombre: string;

  @ApiPropertyOptional({ example: 'CO' })
  codigoIso: string | null;

  @ApiPropertyOptional({ example: 'COP' })
  codigoMoneda: string | null;

  @ApiProperty()
  activo: boolean;

  @ApiPropertyOptional({ example: 1123 })
  ubicacionesCount?: number;

  @ApiPropertyOptional({ example: 12 })
  plantillaTareasCount?: number;

  @ApiPropertyOptional({ example: true })
  calificacionPorPuntosHabilitada?: boolean;

  @ApiPropertyOptional({
    description: 'Indica si el país tiene ubicaciones y plantilla de tareas',
  })
  listoOperacion?: boolean;
  catalogosActivosCount?: number;
  advertencias?: string[];
}

export class PaisReferenciaDto {
  @ApiProperty({ example: 'CO' })
  iso: string;

  @ApiProperty({ example: 'Colombia' })
  nombre: string;

  @ApiProperty({ example: 'COP' })
  codigoMoneda: string;

  @ApiPropertyOptional({ example: 'Colombian peso' })
  codigoMonedaNombre?: string;
}
