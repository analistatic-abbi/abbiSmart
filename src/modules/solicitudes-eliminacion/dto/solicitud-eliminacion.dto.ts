import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSolicitudEliminacionDto {
  @ApiProperty({ example: 'proceso' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  entidadTipo: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  entidadId: number;

  @ApiProperty()
  @IsString()
  @MinLength(5)
  motivo: string;
}

export class ResolverSolicitudDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  comentario?: string;
}

export class SolicitudEliminacionResponseDto {
  id: number;
  entidadTipo: string;
  entidadId: number;
  usuarioSolicitanteId: number;
  motivo: string;
  estado: string;
  usuarioResuelveId: number | null;
  fechaSolicitud: Date;
  fechaResolucion: Date | null;
}
