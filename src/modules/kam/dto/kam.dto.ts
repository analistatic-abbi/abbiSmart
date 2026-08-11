import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { EstadoKamRonda } from '../../../common/enums/estado-kam-ronda.enum';

export class KamQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({ enum: EstadoKamRonda })
  @IsOptional()
  estadoRonda?: EstadoKamRonda;

  @ApiPropertyOptional({
    description:
      'Solo KAMs con ronda actual Ejecutada y sin reunión de fin de ronda agendada',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  sinReunionAgendada?: boolean;
}

export class KamCalendarioQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  anio?: number;
}

/** @deprecated usar CreateBitacoraEntradaDto */
export class BitacoraRondaDto {
  @ApiProperty({ description: 'Texto legado (compat). Preferir `texto`.' })
  @IsString()
  @IsNotEmpty()
  bitacora: string;
}

export class CreateBitacoraEntradaDto {
  @ApiProperty({ description: 'Texto de la entrada de bitácora', maxLength: 4000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  texto: string;
}

export class KamBitacoraEntradaDto {
  id: number;
  rondaId: number;
  usuarioId: number;
  usuarioNombre: string;
  texto: string;
  fechaCreacion: Date;
}

export class ReunionRondaDto {
  @ApiProperty()
  @IsDateString()
  fechaReunionSocializacion: string;
}

export class CrearEncuestaDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  formatoEncuestaId: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  contactoId: number;
}

export class RespuestaEncuestaItemDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  itemId: number;

  @ApiPropertyOptional({ description: 'Obligatorio si el ítem requiere calificación' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  puntaje?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacion?: string;
}

export class GuardarRespuestasEncuestaDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  contactoId: number;

  @ApiProperty({ type: [RespuestaEncuestaItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => RespuestaEncuestaItemDto)
  respuestas: RespuestaEncuestaItemDto[];
}

export class KamResponseDto {
  id: number;
  procesoId: number;
  paisId: number;
  empresaClienteId: number;
  fechaCreacion: Date;
  creadoPorId: number | null;
}

export class KamListItemDto {
  id: number;
  procesoId: number;
  procesoCodigo: string | null;
  procesoIdDigitado: string;
  procesoObjeto: string | null;
  empresaMostrar: string;
  rondaActualNumero: number | null;
  rondaActualEstado: EstadoKamRonda | null;
  fechaReunionSocializacion: string | null;
}

export class KamEncuestaRespuestaResponseDto {
  itemId: number;
  /** @deprecated compat */
  preguntaId?: number;
  puntaje: number | null;
  observacion: string | null;
}

export class ResumenSeccionDto {
  seccionId: number;
  orden: number;
  titulo: string;
  puntosObtenidos: number;
  puntosPosibles: number;
  porcentaje: number | null;
  etiqueta: string;
}

export class ResumenEncuestaDto {
  secciones: ResumenSeccionDto[];
  puntosObtenidos: number;
  puntosPosibles: number;
  porcentajeGlobal: number | null;
  categoria: 'Favorable' | 'Aceptable' | 'Requiere atención' | 'N/A';
  veredictoSugerido: string;
}

export class KamEncuestaContactoResponseDto {
  contactoId: number;
  nombre: string;
  completo: boolean;
  respuestas: KamEncuestaRespuestaResponseDto[];
  resumen?: ResumenEncuestaDto;
}

export class KamEncuestaResponseDto {
  id: number;
  formatoEncuestaId: number;
  formatoNombre: string;
  fechaCreacion: Date;
  veredicto: string | null;
  veredictoEditado: boolean;
  resumen: ResumenEncuestaDto | null;
  contactos: KamEncuestaContactoResponseDto[];
}

export class KamCorrespondenciaItemDto {
  id: number;
  nombre: string;
  url: string;
}

export class KamRondaResponseDto {
  id: number;
  numero: number;
  estado: EstadoKamRonda;
  fechaReunionSocializacion: string | null;
  /** @deprecated usar bitacoraEntradas */
  bitacora: string | null;
  bitacoraEntradas: KamBitacoraEntradaDto[];
  veredicto: string | null;
  veredictoEditado: boolean;
  resumen: ResumenEncuestaDto | null;
  correspondencias: KamCorrespondenciaItemDto[];
  /** @deprecated usar correspondencias */
  correspondenciaNombre: string | null;
  /** @deprecated usar correspondencias */
  correspondenciaUrl: string | null;
  ejecutadoManual: boolean;
  fechaSocializado: Date | null;
  encuestas: KamEncuestaResponseDto[];
}

export class UpdateVeredictoDto {
  @ApiProperty()
  @IsString()
  veredicto: string;
}

export class KamDetailDto extends KamResponseDto {
  procesoCodigo: string | null;
  procesoIdDigitado: string;
  procesoObjeto: string | null;
  empresaMostrar: string;
  contactosProceso: Array<{
    contactoId: number;
    nombre: string;
    cargo: string | null;
    correo: string | null;
  }>;
  rondas: KamRondaResponseDto[];
}

export class KamCalendarioEventoDto {
  kamId: number;
  rondaId: number;
  procesoCodigo: string | null;
  procesoObjeto: string | null;
  empresaMostrar: string;
  tipo: 'reunion';
  fecha: string;
  estado: EstadoKamRonda;
  diasRestantes: number;
}
