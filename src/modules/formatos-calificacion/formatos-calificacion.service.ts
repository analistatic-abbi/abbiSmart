import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  INDICADORES_FINANCIEROS,
  IndicadorCodigo,
} from '../../common/enums/indicador-codigo.enum';
import { ResultadoCalificacion } from '../../common/enums/resultado-calificacion.enum';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import {
  findRangoParaValor,
  parseCeldaNumerica,
  RangoEvaluacion,
  validarFilasImport,
  type RangoImportRow,
} from '../../common/utils/formato-rango.util';
import { readSpreadsheet } from '../../common/utils/spreadsheet-reader';
import { FormatoCalificacionRango } from '../../database/entities/formato-calificacion-rango.entity';
import { FormatoCalificacion } from '../../database/entities/formato-calificacion.entity';
import { ProcesoCalificacionDetalle } from '../../database/entities/proceso-calificacion-detalle.entity';
import { ProcesoCalificacion } from '../../database/entities/proceso-calificacion.entity';
import { Proceso } from '../../database/entities/proceso.entity';
import { ParametrosService } from '../parametros/parametros.service';
import {
  EvaluarCalificacionesDto,
  FormatoCalificacionDetailDto,
  FormatoCalificacionListItemDto,
  FormatoCalificacionRangoResponseDto,
  ProcesoCalificacionDetalleResponseDto,
  ProcesoCalificacionResponseDto,
} from './dto/formato-calificacion.dto';

const COLUMNAS_REQUERIDAS = [
  'indicador_codigo',
  'rango_min',
  'rango_max',
  'puntos',
];

@Injectable()
export class FormatosCalificacionService {
  constructor(
    @InjectRepository(FormatoCalificacion)
    private readonly formatoRepository: Repository<FormatoCalificacion>,
    @InjectRepository(FormatoCalificacionRango)
    private readonly rangoRepository: Repository<FormatoCalificacionRango>,
    @InjectRepository(ProcesoCalificacion)
    private readonly procesoCalificacionRepository: Repository<ProcesoCalificacion>,
    @InjectRepository(ProcesoCalificacionDetalle)
    private readonly detalleRepository: Repository<ProcesoCalificacionDetalle>,
    @InjectRepository(Proceso)
    private readonly procesoRepository: Repository<Proceso>,
    private readonly parametrosService: ParametrosService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(
    paisSesionId: number,
    soloActivos = false,
  ): Promise<FormatoCalificacionListItemDto[]> {
    const qb = this.formatoRepository
      .createQueryBuilder('formato')
      .leftJoin('formato.rangos', 'rango')
      .where('formato.paisId = :paisId', { paisId: paisSesionId })
      .groupBy('formato.id')
      .addGroupBy('formato.nombre')
      .addGroupBy('formato.puntajeMinimo')
      .addGroupBy('formato.activo')
      .addGroupBy('formato.fechaCreacion')
      .select('formato.id', 'id')
      .addSelect('formato.nombre', 'nombre')
      .addSelect('formato.puntajeMinimo', 'puntajeMinimo')
      .addSelect('formato.activo', 'activo')
      .addSelect('formato.fechaCreacion', 'fechaCreacion')
      .addSelect('COUNT(DISTINCT rango.indicadorCodigo)', 'cantidadIndicadores')
      .orderBy('formato.fechaCreacion', 'DESC');

    if (soloActivos) {
      qb.andWhere('formato.activo = :activo', { activo: true });
    }

    const rows = await qb.getRawMany<{
      id: string;
      nombre: string;
      puntajeMinimo: string;
      activo: number;
      fechaCreacion: Date;
      cantidadIndicadores: string;
    }>();

    return rows.map((row) => ({
      id: Number(row.id),
      nombre: row.nombre,
      puntajeMinimo: Number(row.puntajeMinimo),
      activo: Boolean(row.activo),
      cantidadIndicadores: Number(row.cantidadIndicadores),
      fechaCreacion: row.fechaCreacion.toISOString(),
    }));
  }

  async findById(
    id: number,
    paisSesionId: number,
  ): Promise<FormatoCalificacionDetailDto> {
    const formato = await this.formatoRepository.findOne({
      where: { id, paisId: paisSesionId },
      relations: { rangos: true },
    });

    if (!formato) {
      throw new BusinessException(
        ErrorCode.FORMATO_NO_ENCONTRADO,
        'Formato de calificación no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    formato.rangos.sort((a, b) => {
      if (a.indicadorCodigo !== b.indicadorCodigo) {
        return a.indicadorCodigo.localeCompare(b.indicadorCodigo);
      }
      return a.orden - b.orden;
    });

    return this.toDetailDto(formato);
  }

  async importFromSpreadsheet(
    nombre: string,
    puntajeMinimo: number,
    fileName: string,
    buffer: Buffer,
    usuarioId: number,
    paisSesionId: number,
  ): Promise<FormatoCalificacionDetailDto> {
    const existente = await this.formatoRepository.findOne({
      where: { paisId: paisSesionId, nombre },
    });

    if (existente) {
      throw new BusinessException(
        ErrorCode.FORMATO_DUPLICADO,
        `Ya existe un formato con el nombre "${nombre}" en este país`,
        HttpStatus.CONFLICT,
      );
    }

    const filas = await this.parseSpreadsheet(fileName, buffer);
    const { errores, porIndicador } = validarFilasImport(filas);

    if (errores.length > 0) {
      throw new BusinessException(
        ErrorCode.FORMATO_RANGOS_INVALIDOS,
        errores.join('; '),
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const formato = manager.create(FormatoCalificacion, {
        paisId: paisSesionId,
        nombre,
        puntajeMinimo,
        activo: true,
        usuarioCreoId: usuarioId,
      });
      const savedFormato = await manager.save(formato);

      const rangosEntities: FormatoCalificacionRango[] = [];

      for (const [, rangos] of porIndicador) {
        for (const rango of rangos) {
          rangosEntities.push(
            manager.create(FormatoCalificacionRango, {
              formatoId: savedFormato.id,
              indicadorCodigo: rango.indicadorCodigo,
              orden: rango.orden,
              rangoMin: rango.rangoMin?.toString() ?? null,
              rangoMax: rango.rangoMax?.toString() ?? null,
              puntos: rango.puntos,
            }),
          );
        }
      }

      await manager.save(rangosEntities);

      const completo = await manager.findOne(FormatoCalificacion, {
        where: { id: savedFormato.id },
        relations: { rangos: true },
        order: { rangos: { indicadorCodigo: 'ASC', orden: 'ASC' } },
      });

      return this.toDetailDto(completo!);
    });
  }

  async setActivo(
    id: number,
    paisSesionId: number,
    activo: boolean,
  ): Promise<FormatoCalificacionListItemDto> {
    const formato = await this.formatoRepository.findOne({
      where: { id, paisId: paisSesionId },
      relations: { rangos: true },
    });

    if (!formato) {
      throw new BusinessException(
        ErrorCode.FORMATO_NO_ENCONTRADO,
        'Formato de calificación no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    formato.activo = activo;
    await this.formatoRepository.save(formato);

    const indicadores = new Set(formato.rangos.map((r) => r.indicadorCodigo));

    return {
      id: formato.id,
      nombre: formato.nombre,
      puntajeMinimo: formato.puntajeMinimo,
      activo: formato.activo,
      cantidadIndicadores: indicadores.size,
      fechaCreacion: formato.fechaCreacion.toISOString(),
    };
  }

  async findCalificacionesByProceso(
    procesoId: number,
    paisSesionId: number,
  ): Promise<ProcesoCalificacionResponseDto[]> {
    await this.assertProcesoPais(procesoId, paisSesionId);

    const calificaciones = await this.procesoCalificacionRepository.find({
      where: { procesoId },
      relations: {
        formatoCalificacion: true,
        detalle: { formatoRango: true },
      },
      order: {
        fechaEvaluacion: 'DESC',
        detalle: { indicadorCodigo: 'ASC' },
      },
    });

    return calificaciones.map((item) => this.toCalificacionResponse(item));
  }

  async evaluarProceso(
    procesoId: number,
    dto: EvaluarCalificacionesDto,
    usuarioId: number,
    paisSesionId: number,
  ): Promise<ProcesoCalificacionResponseDto[]> {
    const proceso = await this.assertProcesoPais(procesoId, paisSesionId);
    const formatoIds = [...new Set(dto.formatoIds.map((id) => Number(id)))];
    const anioParametros =
      dto.anioParametros ?? proceso.anioParametros ?? new Date().getFullYear() - 1;

    await this.dataSource.transaction(async (manager) => {
      for (const formatoId of formatoIds) {
        const formato = await manager.findOne(FormatoCalificacion, {
          where: { id: formatoId },
          relations: { rangos: true },
        });

        if (!formato) {
          throw new BusinessException(
            ErrorCode.FORMATO_NO_ENCONTRADO,
            `Formato ${formatoId} no encontrado`,
            HttpStatus.NOT_FOUND,
          );
        }

        if (formato.paisId !== proceso.paisId) {
          throw new BusinessException(
            ErrorCode.CALIFICACION_FORMATO_PAIS_INVALIDO,
            `El formato "${formato.nombre}" no pertenece al país del proceso`,
            HttpStatus.BAD_REQUEST,
          );
        }

        if (!formato.activo) {
          throw new BusinessException(
            ErrorCode.FORMATO_INACTIVO,
            `El formato "${formato.nombre}" está inactivo`,
            HttpStatus.BAD_REQUEST,
          );
        }

        const rangosPorIndicador = this.groupRangosByIndicador(formato.rangos);
        let puntajeTotal = 0;
        const detalleRows: Array<{
          indicadorCodigo: IndicadorCodigo;
          parametroFinancieroId: number;
          valorAbbi: string;
          formatoRangoId: number;
          puntosObtenidos: number;
        }> = [];

        for (const [indicadorCodigo, rangos] of rangosPorIndicador) {
          const parametro = await this.parametrosService.findPorIndicadorYAnio(
            paisSesionId,
            indicadorCodigo,
            anioParametros,
          );

          if (!parametro) {
            throw new BusinessException(
              ErrorCode.CALIFICACION_PARAMETRO_FALTANTE,
              `No hay parámetro para el indicador ${indicadorCodigo} en el año ${anioParametros}`,
              HttpStatus.BAD_REQUEST,
            );
          }

          const valor = Number(parametro.valor);
          const evalRangos: RangoEvaluacion[] = rangos.map((r) => ({
            id: r.id,
            orden: r.orden,
            rangoMin: r.rangoMin !== null ? Number(r.rangoMin) : null,
            rangoMax: r.rangoMax !== null ? Number(r.rangoMax) : null,
            puntos: r.puntos,
          }));

          const match = findRangoParaValor(evalRangos, valor);

          if (!match || match.id === undefined) {
            throw new BusinessException(
              ErrorCode.CALIFICACION_VALOR_SIN_RANGO,
              `El valor ABBI ${valor} del indicador ${indicadorCodigo} no cae en ningún rango del formato "${formato.nombre}"`,
              HttpStatus.BAD_REQUEST,
            );
          }

          puntajeTotal += match.puntos;
          detalleRows.push({
            indicadorCodigo,
            parametroFinancieroId: parametro.id,
            valorAbbi: parametro.valor,
            formatoRangoId: match.id,
            puntosObtenidos: match.puntos,
          });
        }

        const resultado =
          puntajeTotal >= formato.puntajeMinimo
            ? ResultadoCalificacion.APROBADO
            : ResultadoCalificacion.NO_APROBADO;

        let calificacion = await manager.findOne(ProcesoCalificacion, {
          where: { procesoId, formatoCalificacionId: formatoId },
        });

        if (calificacion) {
          calificacion.anioParametros = anioParametros;
          calificacion.puntajeTotal = puntajeTotal;
          calificacion.puntajeMinimo = formato.puntajeMinimo;
          calificacion.resultado = resultado;
          calificacion.usuarioEvaluoId = usuarioId;
          calificacion.fechaEvaluacion = new Date();
        } else {
          calificacion = manager.create(ProcesoCalificacion, {
            procesoId,
            formatoCalificacionId: formatoId,
            anioParametros,
            puntajeTotal,
            puntajeMinimo: formato.puntajeMinimo,
            resultado,
            usuarioEvaluoId: usuarioId,
          });
        }

        const saved = await manager.save(calificacion);
        await manager.delete(ProcesoCalificacionDetalle, {
          procesoCalificacionId: saved.id,
        });

        const detalleEntities = detalleRows.map((row) =>
          manager.create(ProcesoCalificacionDetalle, {
            procesoCalificacionId: saved.id,
            ...row,
          }),
        );
        await manager.save(detalleEntities);
      }
    });

    return this.findCalificacionesByProceso(procesoId, paisSesionId);
  }

  private async parseSpreadsheet(
    fileName: string,
    buffer: Buffer,
  ): Promise<RangoImportRow[]> {
    const rows = await readSpreadsheet(buffer, fileName);

    if (rows.length < 2) {
      throw new BusinessException(
        ErrorCode.FORMATO_RANGOS_INVALIDOS,
        'El archivo debe incluir encabezado y al menos una fila de datos',
        HttpStatus.BAD_REQUEST,
      );
    }

    const headers = rows[0]!.map((cell) => cell.trim().toLowerCase());
    const missing = COLUMNAS_REQUERIDAS.filter((col) => !headers.includes(col));

    if (missing.length > 0) {
      throw new BusinessException(
        ErrorCode.FORMATO_RANGOS_INVALIDOS,
        `Faltan columnas obligatorias: ${missing.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const index = Object.fromEntries(headers.map((h, i) => [h, i]));
    const filas: RangoImportRow[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]!;
      const codigoRaw = row[index.indicador_codigo!]?.trim().toUpperCase();

      if (!codigoRaw) {
        continue;
      }

      if (!INDICADORES_FINANCIEROS.includes(codigoRaw as IndicadorCodigo)) {
        throw new BusinessException(
          ErrorCode.FORMATO_RANGOS_INVALIDOS,
          `Fila Excel ${i + 1}: indicador_codigo "${codigoRaw}" no es válido`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const rangoMinRaw = row[index.rango_min!] ?? '';
      const rangoMaxRaw = row[index.rango_max!] ?? '';
      const puntosRaw = row[index.puntos!] ?? '';

      if (rangoMinRaw.trim() && parseCeldaNumerica(rangoMinRaw) === null) {
        throw new BusinessException(
          ErrorCode.FORMATO_RANGOS_INVALIDOS,
          `Fila Excel ${i + 1}: rango_min no es un número válido`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (rangoMaxRaw.trim() && parseCeldaNumerica(rangoMaxRaw) === null) {
        throw new BusinessException(
          ErrorCode.FORMATO_RANGOS_INVALIDOS,
          `Fila Excel ${i + 1}: rango_max no es un número válido`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const puntosParsed = parseCeldaNumerica(puntosRaw);
      if (puntosParsed === null || !Number.isInteger(puntosParsed) || puntosParsed < 0) {
        throw new BusinessException(
          ErrorCode.FORMATO_RANGOS_INVALIDOS,
          `Fila Excel ${i + 1}: puntos debe ser un entero ≥ 0`,
          HttpStatus.BAD_REQUEST,
        );
      }

      filas.push({
        excelRow: i + 1,
        indicadorCodigo: codigoRaw as IndicadorCodigo,
        rangoMin: parseCeldaNumerica(rangoMinRaw),
        rangoMax: parseCeldaNumerica(rangoMaxRaw),
        puntos: puntosParsed,
      });
    }

    if (filas.length === 0) {
      throw new BusinessException(
        ErrorCode.FORMATO_RANGOS_INVALIDOS,
        'El archivo no contiene filas de rangos',
        HttpStatus.BAD_REQUEST,
      );
    }

    return filas;
  }

  private groupRangosByIndicador(
    rangos: FormatoCalificacionRango[],
  ): Map<IndicadorCodigo, FormatoCalificacionRango[]> {
    const map = new Map<IndicadorCodigo, FormatoCalificacionRango[]>();

    for (const rango of rangos) {
      const grupo = map.get(rango.indicadorCodigo) ?? [];
      grupo.push(rango);
      map.set(rango.indicadorCodigo, grupo);
    }

    for (const [, grupo] of map) {
      grupo.sort((a, b) => a.orden - b.orden);
    }

    return map;
  }

  private async assertProcesoPais(
    procesoId: number,
    paisSesionId: number,
  ): Promise<Proceso> {
    const proceso = await this.procesoRepository.findOne({
      where: { id: procesoId, paisId: paisSesionId },
    });

    if (!proceso) {
      throw new BusinessException(
        ErrorCode.PROCESO_NO_ENCONTRADO,
        'Proceso no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    return proceso;
  }

  private toRangoDto(rango: FormatoCalificacionRango): FormatoCalificacionRangoResponseDto {
    return {
      id: rango.id,
      indicadorCodigo: rango.indicadorCodigo,
      orden: rango.orden,
      rangoMin: rango.rangoMin,
      rangoMax: rango.rangoMax,
      puntos: rango.puntos,
    };
  }

  private toDetailDto(formato: FormatoCalificacion): FormatoCalificacionDetailDto {
    const indicadores = new Set(formato.rangos.map((r) => r.indicadorCodigo));

    return {
      id: formato.id,
      nombre: formato.nombre,
      puntajeMinimo: formato.puntajeMinimo,
      activo: formato.activo,
      cantidadIndicadores: indicadores.size,
      fechaCreacion: formato.fechaCreacion.toISOString(),
      rangos: formato.rangos.map((r) => this.toRangoDto(r)),
    };
  }

  private toCalificacionResponse(
    calificacion: ProcesoCalificacion,
  ): ProcesoCalificacionResponseDto {
    return {
      id: calificacion.id,
      formatoCalificacionId: calificacion.formatoCalificacionId,
      formatoNombre: calificacion.formatoCalificacion.nombre,
      anioParametros: calificacion.anioParametros,
      puntajeTotal: calificacion.puntajeTotal,
      puntajeMinimo: calificacion.puntajeMinimo,
      resultado: calificacion.resultado,
      fechaEvaluacion: calificacion.fechaEvaluacion.toISOString(),
      detalle: (calificacion.detalle ?? []).map(
        (item): ProcesoCalificacionDetalleResponseDto => ({
          indicadorCodigo: item.indicadorCodigo,
          parametroFinancieroId: item.parametroFinancieroId,
          valorAbbi: item.valorAbbi,
          rangoMin: item.formatoRango?.rangoMin ?? null,
          rangoMax: item.formatoRango?.rangoMax ?? null,
          puntosObtenidos: item.puntosObtenidos,
        }),
      ),
    };
  }
}
