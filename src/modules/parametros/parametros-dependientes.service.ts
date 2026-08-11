import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ResultadoCalificacion } from '../../common/enums/resultado-calificacion.enum';
import {
  evaluarResultadoIndicador,
} from '../../common/utils/indicador-resultado.util';
import {
  findRangoParaValor,
  type RangoEvaluacion,
} from '../../common/utils/formato-rango.util';
import { FormatoCalificacionRango } from '../../database/entities/formato-calificacion-rango.entity';
import { FormatoCalificacion } from '../../database/entities/formato-calificacion.entity';
import { ProcesoCalificacionDetalle } from '../../database/entities/proceso-calificacion-detalle.entity';
import { ProcesoCalificacion } from '../../database/entities/proceso-calificacion.entity';
import { ProcesoIndicador } from '../../database/entities/proceso-indicador.entity';
import { ParametroFinanciero } from '../../database/entities/parametro-financiero.entity';
import { PaisConfigService } from '../catalogos/pais-config.service';

export interface ParametrosPropagacionResult {
  indicadoresActualizados: number;
  calificacionesActualizadas: number;
  calificacionesOmitidas: number;
}

@Injectable()
export class ParametrosDependientesService {
  private readonly logger = new Logger(ParametrosDependientesService.name);

  constructor(
    @InjectRepository(ProcesoIndicador)
    private readonly indicadorRepository: Repository<ProcesoIndicador>,
    @InjectRepository(ProcesoCalificacion)
    private readonly calificacionRepository: Repository<ProcesoCalificacion>,
    @InjectRepository(FormatoCalificacion)
    private readonly formatoRepository: Repository<FormatoCalificacion>,
    @InjectRepository(ParametroFinanciero)
    private readonly parametroRepository: Repository<ParametroFinanciero>,
    private readonly paisConfigService: PaisConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async propagarCambios(
    paisId: number,
    anio: number,
    actorId: number,
    indicadoresAfectados: string[],
  ): Promise<ParametrosPropagacionResult> {
    const indicadoresActualizados = await this.actualizarCumplimientoIndicadores(
      paisId,
      anio,
      indicadoresAfectados,
    );

    const { actualizadas, omitidas } = await this.actualizarCalificaciones(
      paisId,
      anio,
      actorId,
    );

    return {
      indicadoresActualizados,
      calificacionesActualizadas: actualizadas,
      calificacionesOmitidas: omitidas,
    };
  }

  private async actualizarCumplimientoIndicadores(
    paisId: number,
    anio: number,
    indicadoresAfectados: string[],
  ): Promise<number> {
    const qb = this.indicadorRepository
      .createQueryBuilder('pi')
      .innerJoin('pi.proceso', 'p')
      .where('p.pais_id = :paisId', { paisId })
      .andWhere('p.anio_parametros = :anio', { anio })
      .andWhere('pi.valor_requerido IS NOT NULL');

    if (indicadoresAfectados.length > 0) {
      qb.andWhere('pi.indicador_codigo IN (:...indicadores)', {
        indicadores: indicadoresAfectados,
      });
    }

    const filas = await qb.getMany();
    if (filas.length === 0) {
      return 0;
    }

    const margenPct = await this.paisConfigService.getMargenCasiPct(paisId);

    let actualizados = 0;

    for (const fila of filas) {
      const parametro = await this.findPorIndicadorYAnio(
        paisId,
        fila.indicadorCodigo,
        anio,
      );

      if (!parametro) {
        continue;
      }

      const cumple = evaluarResultadoIndicador(
        Number(fila.valorRequerido),
        Number(parametro.valor),
        parametro.reglaCumplimiento,
        margenPct,
      );

      fila.cumple = cumple;
      fila.parametroFinancieroId = parametro.id;
      await this.indicadorRepository.save(fila);
      actualizados += 1;
    }

    return actualizados;
  }

  private async actualizarCalificaciones(
    paisId: number,
    anio: number,
    actorId: number,
  ): Promise<{ actualizadas: number; omitidas: number }> {
    const calificaciones = await this.calificacionRepository
      .createQueryBuilder('c')
      .innerJoin('c.proceso', 'p')
      .where('p.pais_id = :paisId', { paisId })
      .andWhere('c.anio_parametros = :anio', { anio })
      .getMany();

    let actualizadas = 0;
    let omitidas = 0;

    for (const calificacion of calificaciones) {
      try {
        await this.reevaluarCalificacion(calificacion, paisId, anio, actorId);
        actualizadas += 1;
      } catch (error) {
        omitidas += 1;
        const message =
          error instanceof Error ? error.message : 'Error desconocido';
        this.logger.warn(
          `No se pudo actualizar calificación ${calificacion.id} del proceso ${calificacion.procesoId}: ${message}`,
        );
      }
    }

    return { actualizadas, omitidas };
  }

  private async reevaluarCalificacion(
    calificacion: ProcesoCalificacion,
    paisId: number,
    anio: number,
    actorId: number,
  ): Promise<void> {
    const formato = await this.formatoRepository.findOne({
      where: { id: calificacion.formatoCalificacionId, paisId },
      relations: { rangos: true },
    });

    if (!formato) {
      throw new Error(`Formato ${calificacion.formatoCalificacionId} no encontrado`);
    }

    const rangosPorIndicador = this.groupRangosByIndicador(formato.rangos);
    let puntajeTotal = 0;
    const detalleRows: Array<{
      indicadorCodigo: string;
      parametroFinancieroId: number;
      valorAbbi: string;
      formatoRangoId: number;
      puntosObtenidos: number;
    }> = [];

    for (const [indicadorCodigo, rangos] of rangosPorIndicador) {
      const parametro = await this.findPorIndicadorYAnio(
        paisId,
        indicadorCodigo,
        anio,
      );

      if (!parametro) {
        throw new Error(
          `No hay parámetro para el indicador ${indicadorCodigo} en el año ${anio}`,
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
        throw new Error(
          `El valor ABBI ${valor} del indicador ${indicadorCodigo} no cae en ningún rango del formato "${formato.nombre}"`,
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

    await this.dataSource.transaction(async (manager) => {
      calificacion.anioParametros = anio;
      calificacion.puntajeTotal = puntajeTotal;
      calificacion.puntajeMinimo = formato.puntajeMinimo;
      calificacion.resultado = resultado;
      calificacion.usuarioEvaluoId = actorId;
      calificacion.fechaEvaluacion = new Date();

      const saved = await manager.save(ProcesoCalificacion, calificacion);
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
    });
  }

  private async findPorIndicadorYAnio(
    paisId: number,
    indicadorCodigo: string,
    anio: number,
  ): Promise<ParametroFinanciero | null> {
    return this.parametroRepository.findOne({
      where: {
        paisId,
        indicadorCodigo,
        anio,
      },
    });
  }

  private groupRangosByIndicador(
    rangos: FormatoCalificacionRango[],
  ): Map<string, FormatoCalificacionRango[]> {
    const map = new Map<string, FormatoCalificacionRango[]>();

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
}
