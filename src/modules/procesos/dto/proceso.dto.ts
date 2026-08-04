import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  CUANTIA_MAX,
  CUANTIA_MAX_MENSAJE,
} from '../../../common/constants/cuantia.constants';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { FiltroEliminados } from '../../../common/enums/filtro-eliminados.enum';
import { EstadoProceso } from '../../../common/enums/estado-proceso.enum';
import { MotivoPerdidaProceso } from '../../../common/enums/motivo-perdida-proceso.enum';
import { IndicadorCodigo } from '../../../common/enums/indicador-codigo.enum';
import { SegmentoProceso } from '../../../common/enums/segmento-proceso.enum';
import { TipoInstrumento } from '../../../common/enums/tipo-instrumento.enum';
import { TipoProceso } from '../../../common/enums/tipo-proceso.enum';

export class ProcesosQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: EstadoProceso })
  @IsOptional()
  @IsEnum(EstadoProceso)
  estado?: EstadoProceso;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({ enum: SegmentoProceso })
  @IsOptional()
  @IsEnum(SegmentoProceso)
  segmento?: SegmentoProceso;

  @ApiPropertyOptional({ enum: TipoProceso })
  @IsOptional()
  @IsEnum(TipoProceso)
  tipoProceso?: TipoProceso;

  @ApiPropertyOptional({ enum: TipoInstrumento })
  @IsOptional()
  @IsEnum(TipoInstrumento)
  tipoInstrumento?: TipoInstrumento;

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

  @ApiPropertyOptional({ description: 'Deprecated: use filtroEliminados=todos' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  incluirEliminados?: boolean;
}

export class ProcesoIndicadorInputDto {
  @ApiProperty({ enum: IndicadorCodigo })
  @IsEnum(IndicadorCodigo)
  indicadorCodigo: IndicadorCodigo;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  valorRequerido?: number | null;
}

export class CreateProcesoDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  idDigitado: string;

  @ApiPropertyOptional()
  @ValidateIf((dto: CreateProcesoDto) => !dto.empresaOtro)
  @IsInt()
  @Type(() => Number)
  empresaClienteId?: number;

  @ApiPropertyOptional()
  @ValidateIf((dto: CreateProcesoDto) => !dto.empresaClienteId)
  @IsString()
  @MaxLength(255)
  empresaOtro?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  ubicacionId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  portalOrigen?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  link?: string;

  @ApiPropertyOptional({ description: 'Objeto o descripción del proceso' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  objeto?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(CUANTIA_MAX, { message: CUANTIA_MAX_MENSAJE })
  cuantia: number;

  @ApiProperty({ enum: SegmentoProceso })
  @IsEnum(SegmentoProceso)
  segmento: SegmentoProceso;

  @ApiProperty({ enum: TipoProceso })
  @IsEnum(TipoProceso)
  tipoProceso: TipoProceso;

  @ApiProperty({ enum: TipoInstrumento })
  @IsEnum(TipoInstrumento)
  tipoInstrumento: TipoInstrumento;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  plazoEjecucionMeses: number;

  @ApiProperty({ default: false })
  @IsBoolean()
  experiencia: boolean;

  @ApiPropertyOptional()
  @ValidateIf((dto: CreateProcesoDto) => dto.experiencia)
  @IsString()
  observacion?: string;

  @ApiPropertyOptional({ description: 'Vincular proyección al crear el proceso (PRY-015)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  proyeccionId?: number;

  @ApiProperty({ type: [ProcesoIndicadorInputDto] })
  @IsArray()
  @ArrayMinSize(8)
  @ValidateNested({ each: true })
  @Type(() => ProcesoIndicadorInputDto)
  indicadores: ProcesoIndicadorInputDto[];

  @ApiPropertyOptional({ description: 'Requerido si algún indicador queda vacío (PAR-007)' })
  @IsOptional()
  @IsBoolean()
  confirmarIndicadoresVacios?: boolean;

  @ApiPropertyOptional({
    description: 'Año de parámetros financieros para evaluar indicadores (default: año anterior)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  anioParametros?: number;

  @ApiProperty({ description: 'Fecha de apertura (FEC-001)' })
  @IsDateString()
  fechaApertura: string;

  @ApiProperty({ description: 'Fecha de cierre (FEC-001)' })
  @IsDateString()
  fechaCierre: string;
}

export class UpdateProcesoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  portalOrigen?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  link?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  objeto?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(CUANTIA_MAX, { message: CUANTIA_MAX_MENSAJE })
  cuantia?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  experiencia?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacion?: string | null;
}

export class UpdateProcesoFechasDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaApertura?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaCierre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaManifestacionInteres?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaAdquisicionDerecho?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaReunionAclaratoria?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaVisitaTecnica?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaSolicitudesAclaracion?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaRespuestaAclaracion?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaLimitacionMypymes?: string | null;
}

export class CambiarEstadoProcesoDto {
  @ApiProperty({ enum: EstadoProceso })
  @IsEnum(EstadoProceso)
  estado: EstadoProceso;

  @ApiPropertyOptional({ enum: MotivoPerdidaProceso })
  @IsOptional()
  @IsEnum(MotivoPerdidaProceso)
  motivoPerdida?: MotivoPerdidaProceso;

  @ApiPropertyOptional({ description: 'Obligatorio si motivoPerdida es Otro' })
  @ValidateIf((dto: CambiarEstadoProcesoDto) => dto.motivoPerdida === MotivoPerdidaProceso.OTRO)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  motivoPerdidaOtro?: string;
}

export class RegistrarMotivoPerdidaDto {
  @ApiProperty({ enum: MotivoPerdidaProceso })
  @IsEnum(MotivoPerdidaProceso)
  motivoPerdida: MotivoPerdidaProceso;

  @ApiPropertyOptional({ description: 'Obligatorio si motivoPerdida es Otro' })
  @ValidateIf((dto: RegistrarMotivoPerdidaDto) => dto.motivoPerdida === MotivoPerdidaProceso.OTRO)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  motivoPerdidaOtro?: string;
}

export class ProcesoIndicadorResponseDto {
  id: number;
  indicadorCodigo: IndicadorCodigo;
  valorRequerido: string | null;
  parametroFinancieroId: number | null;
  cumple: string | null;
}

export class ProcesoResponseDto {
  id: number;
  idDigitado: string;
  codigo: string | null;
  empresaClienteId: number | null;
  empresaOtro: string | null;
  paisId: number;
  ubicacionId: number;
  portalOrigen: string | null;
  link: string | null;
  objeto: string | null;
  cuantia: string;
  moneda: string;
  segmento: SegmentoProceso;
  tipoProceso: TipoProceso;
  tipoInstrumento: TipoInstrumento;
  plazoEjecucionMeses: number;
  experiencia: boolean;
  observacion: string | null;
  motivoPerdida: MotivoPerdidaProceso | null;
  motivoPerdidaOtro: string | null;
  motivoPerdidaRegistradoEn: Date | null;
  motivoPerdidaUsuarioId: number | null;
  motivoPerdidaUsuarioNombre?: string | null;
  fueAdjudicado: boolean;
  estado: EstadoProceso;
  usuarioCreadorId: number;
  anioParametros: number;
  fechaCreacion: Date;
  fechaApertura: string | null;
  fechaManifestacionInteres: string | null;
  fechaAdquisicionDerecho: string | null;
  fechaReunionAclaratoria: string | null;
  fechaVisitaTecnica: string | null;
  fechaSolicitudesAclaracion: string | null;
  fechaRespuestaAclaracion: string | null;
  fechaLimitacionMypymes: string | null;
  fechaCierre: string | null;
  fechaInicioEjecucion: string | null;
  fechaFinalizacion: string | null;
  empresaMostrar?: string | null;
  diasRestantesCierre?: number | null;
  avancePorcentaje?: number | null;
  diasEspera?: number | null;
  fechaEsperada?: string | null;
  mesesEjecucionAnioReporte?: number | null;
  facturacionEstimadaAnioReporte?: string | null;
  indicadores?: ProcesoIndicadorResponseDto[];
  devueltoValidacion?: boolean;
  comentarioDevolucionValidacion?: string | null;
  validadorDevolucionNombre?: string | null;
  fechaDevolucionValidacion?: Date | null;
}

export class CreateProcesoComentarioDto {
  @ApiProperty({ description: 'Texto del comentario interno', maxLength: 4000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  texto: string;
}

export class ProcesoComentarioResponseDto {
  id: number;
  procesoId: number;
  usuarioId: number;
  usuarioNombre: string;
  texto: string;
  fechaCreacion: Date;
}

export class CompletarTareaDto {
  @ApiPropertyOptional({
    description: 'Nota escrita opcional. Obligatoria solo si no se adjunta archivo.',
  })
  @IsOptional()
  @IsString()
  evidencia?: string;

  @ApiProperty({ description: 'Confirmación explícita de finalización (SEG-002)' })
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  confirmar: boolean;
}

export class TareaResponseDto {
  id: number;
  procesoId: number;
  tareaCodigo: string;
  aplica: boolean;
  evidencia: string | null;
  evidenciaArchivoNombre: string | null;
  evidenciaUrl: string | null;
  completada: boolean;
  fechaCompletada: Date | null;
  usuarioCompletoId: number | null;
  avancePorcentaje?: number;
}

export class AsignarValidadoresDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsInt({ each: true })
  validadorIds: number[];
}

export class VeredictoValidacionDto {
  @ApiProperty({ enum: ['Aprobado', 'Requiere Corrección'] })
  @IsEnum(['Aprobado', 'Requiere Corrección'] as const)
  veredicto: 'Aprobado' | 'Requiere Corrección';

  @ApiPropertyOptional()
  @ValidateIf((dto: VeredictoValidacionDto) => dto.veredicto === 'Requiere Corrección')
  @IsString()
  @IsNotEmpty()
  comentario?: string;
}
