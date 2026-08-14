import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, Min } from 'class-validator';
import { BandejaUrgencia } from '../../../common/enums/bandeja-urgencia.enum';
import { FijacionEntidadTipo } from '../../../common/enums/fijacion-entidad-tipo.enum';

export class FijarEntidadDto {
  @ApiProperty({ enum: FijacionEntidadTipo })
  @IsEnum(FijacionEntidadTipo)
  entidadTipo: FijacionEntidadTipo;

  @ApiProperty()
  @IsInt()
  @Min(1)
  entidadId: number;
}

export class BandejaItemDto {
  id: number;
  entidadTipo: FijacionEntidadTipo;
  titulo: string;
  subtitulo?: string | null;
  empresa?: string | null;
  objeto?: string | null;
  estado: string;
  fecha: string;
  fechaRelevanteLabel: string;
  diasRestantes: number | null;
  urgencia: BandejaUrgencia;
  icono: string;
  ruta: string;
  fechaFijacion: string;
}

export class BandejaResumenConteoDto {
  clave: string;
  total: number;
}

export class BandejaResumenDto {
  totalFijados: number;
  totalProcesos: number;
  totalProyecciones: number;
  totalRelacionamientos: number;
  totalKams: number;
  urgentes: number;
  vencidos: number;
  porUrgencia: BandejaResumenConteoDto[];
  porEstadoProcesos: BandejaResumenConteoDto[];
}

export class BandejaPersonalResponseDto {
  resumen: BandejaResumenDto;
  procesos: BandejaItemDto[];
  proyecciones: BandejaItemDto[];
  relacionamientos: BandejaItemDto[];
  kams: BandejaItemDto[];
}

export class FijacionEstadoDto {
  fijado: boolean;
}
