import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClienteResponseDto } from './cliente-response.dto';

export class ClienteVista360ResumenDto {
  @ApiProperty()
  procesosActivos: number;

  @ApiProperty()
  cuantiaTotal: string;

  @ApiProperty()
  proyeccionesAbiertas: number;

  @ApiProperty()
  relacionamientosVencidos: number;

  @ApiProperty()
  totalContactos: number;
}

export class ClienteVista360ProcesoDto {
  @ApiProperty()
  id: number;

  @ApiPropertyOptional()
  codigo: string | null;

  @ApiProperty()
  idDigitado: string;

  @ApiProperty()
  estado: string;

  @ApiProperty()
  cuantia: string;

  @ApiProperty()
  moneda: string;

  @ApiPropertyOptional()
  fechaCierre: string | null;
}

export class ClienteVista360ProyeccionDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  anioProyectado: number;

  @ApiProperty()
  estado: string;

  @ApiPropertyOptional()
  mercado: string | null;

  @ApiProperty()
  valorVenta: string;

  @ApiProperty()
  valorFacturacion: string;

  @ApiProperty()
  fechaEstimadaPublicacion: string;
}

export class ClienteVista360RelacionamientoDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  contactoNombre: string;

  @ApiProperty()
  canal: string;

  @ApiProperty()
  fechaMensaje: string;

  @ApiPropertyOptional()
  resultado: string | null;

  @ApiProperty()
  vencido: boolean;
}

export class ClienteVista360Dto {
  @ApiProperty({ type: ClienteResponseDto })
  cliente: ClienteResponseDto;

  @ApiPropertyOptional()
  ubicacionLabel: string | null;

  @ApiProperty({ type: ClienteVista360ResumenDto })
  resumen: ClienteVista360ResumenDto;

  @ApiProperty({ type: [ClienteVista360ProcesoDto] })
  procesos: ClienteVista360ProcesoDto[];

  @ApiProperty({ type: [ClienteVista360ProyeccionDto] })
  proyecciones: ClienteVista360ProyeccionDto[];

  @ApiProperty({ type: [ClienteVista360RelacionamientoDto] })
  relacionamientos: ClienteVista360RelacionamientoDto[];
}
