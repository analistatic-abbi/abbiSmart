import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { EstadoProceso } from '../../../common/enums/estado-proceso.enum';
import { FiltroEliminados } from '../../../common/enums/filtro-eliminados.enum';
import { PortalOrigen } from '../../../common/enums/portal-origen.enum';
import { TipoInstrumento } from '../../../common/enums/tipo-instrumento.enum';
import { TipoProceso } from '../../../common/enums/tipo-proceso.enum';

export class DashboardProcesosQueryDto {
  @ApiPropertyOptional({ description: 'Búsqueda por código, objeto o ID digitado' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({ enum: EstadoProceso })
  @IsOptional()
  @IsEnum(EstadoProceso)
  estado?: EstadoProceso;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  segmento?: string;

  @ApiPropertyOptional({ enum: TipoProceso })
  @IsOptional()
  @IsEnum(TipoProceso)
  tipoProceso?: TipoProceso;

  @ApiPropertyOptional({ enum: TipoInstrumento })
  @IsOptional()
  @IsEnum(TipoInstrumento)
  tipoInstrumento?: TipoInstrumento;

  @ApiPropertyOptional({ enum: PortalOrigen })
  @IsOptional()
  @IsEnum(PortalOrigen)
  portalOrigen?: PortalOrigen;

  @ApiPropertyOptional({ description: 'Filtrar por cliente/empresa registrada' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  empresaClienteId?: number;

  @ApiPropertyOptional({ description: 'Filtro fecha cierre desde (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  fechaCierreDesde?: string;

  @ApiPropertyOptional({ description: 'Filtro fecha cierre hasta (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  fechaCierreHasta?: string;

  @ApiPropertyOptional({
    enum: FiltroEliminados,
    default: FiltroEliminados.ACTIVOS,
    description: 'activos | todos | solo_eliminados (Admin/Supervisor)',
  })
  @IsOptional()
  @IsEnum(FiltroEliminados)
  filtroEliminados?: FiltroEliminados;
}

export class DashboardProyeccionesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anio?: number;
}

export class DashboardExportQueryDto extends DashboardProcesosQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anio?: number;
}
