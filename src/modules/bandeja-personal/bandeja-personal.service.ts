import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BandejaUrgencia } from '../../common/enums/bandeja-urgencia.enum';
import { FijacionEntidadTipo } from '../../common/enums/fijacion-entidad-tipo.enum';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import {
  BANDEJA_URGENCIA_ORDEN,
  calcularUrgenciaBandeja,
  diasHastaFecha,
} from '../../common/utils/bandeja-urgencia.util';
import { normalizarFechaDesdeBd } from '../../common/utils/proceso-fechas.util';
import { Proceso } from '../../database/entities/proceso.entity';
import { Proyeccion } from '../../database/entities/proyeccion.entity';
import { Relacionamiento } from '../../database/entities/relacionamiento.entity';
import { UsuarioFijacion } from '../../database/entities/usuario-fijacion.entity';
import {
  BandejaItemDto,
  BandejaPersonalResponseDto,
  BandejaResumenConteoDto,
  BandejaResumenDto,
  FijacionEstadoDto,
  FijarEntidadDto,
} from './dto/bandeja-personal.dto';

@Injectable()
export class BandejaPersonalService {
  constructor(
    @InjectRepository(UsuarioFijacion)
    private readonly fijacionRepository: Repository<UsuarioFijacion>,
    @InjectRepository(Proceso)
    private readonly procesoRepository: Repository<Proceso>,
    @InjectRepository(Proyeccion)
    private readonly proyeccionRepository: Repository<Proyeccion>,
    @InjectRepository(Relacionamiento)
    private readonly relacionamientoRepository: Repository<Relacionamiento>,
    private readonly dataSource: DataSource,
  ) {}

  async getBandeja(
    usuarioId: number,
    paisSesionId: number,
  ): Promise<BandejaPersonalResponseDto> {
    const fijaciones = await this.fijacionRepository.find({
      where: { usuarioId: Number(usuarioId) },
      order: { fechaFijacion: 'DESC' },
    });

    const procesos: BandejaItemDto[] = [];
    const proyecciones: BandejaItemDto[] = [];
    const relacionamientos: BandejaItemDto[] = [];

    for (const fijacion of fijaciones) {
      const item = await this.buildItem(fijacion, paisSesionId);
      if (!item) continue;

      switch (fijacion.entidadTipo) {
        case FijacionEntidadTipo.PROCESO:
          procesos.push(item);
          break;
        case FijacionEntidadTipo.PROYECCION:
          proyecciones.push(item);
          break;
        case FijacionEntidadTipo.RELACIONAMIENTO:
          relacionamientos.push(item);
          break;
      }
    }

    const procesosOrdenados = this.sortByUrgencia(procesos);
    const proyeccionesOrdenadas = this.sortByUrgencia(proyecciones);
    const relacionamientosOrdenados = this.sortByUrgencia(relacionamientos);

    return {
      resumen: this.buildResumen(
        procesosOrdenados,
        proyeccionesOrdenadas,
        relacionamientosOrdenados,
      ),
      procesos: procesosOrdenados,
      proyecciones: proyeccionesOrdenadas,
      relacionamientos: relacionamientosOrdenados,
    };
  }

  async fijar(
    usuarioId: number,
    paisSesionId: number,
    dto: FijarEntidadDto,
  ): Promise<void> {
    await this.assertEntidadAccesible(
      dto.entidadTipo,
      dto.entidadId,
      paisSesionId,
    );

    const existente = await this.fijacionRepository.findOne({
      where: {
        usuarioId,
        entidadTipo: dto.entidadTipo,
        entidadId: dto.entidadId,
      },
    });

    if (existente) {
      return;
    }

    const fijacion = this.fijacionRepository.create({
      usuarioId,
      entidadTipo: dto.entidadTipo,
      entidadId: dto.entidadId,
    });

    await this.fijacionRepository.save(fijacion);
  }

  async desfijar(
    usuarioId: number,
    entidadTipo: FijacionEntidadTipo,
    entidadId: number,
  ): Promise<void> {
    await this.fijacionRepository.delete({
      usuarioId,
      entidadTipo,
      entidadId,
    });
  }

  async getEstado(
    usuarioId: number,
    entidadTipo: FijacionEntidadTipo,
    entidadId: number,
  ): Promise<FijacionEstadoDto> {
    const fijado = await this.fijacionRepository.exists({
      where: {
        usuarioId,
        entidadTipo,
        entidadId,
      },
    });

    return { fijado };
  }

  private async assertEntidadAccesible(
    entidadTipo: FijacionEntidadTipo,
    entidadId: number,
    paisSesionId: number,
  ): Promise<void> {
    const accesible = await this.isEntidadAccesible(
      entidadTipo,
      entidadId,
      paisSesionId,
    );

    if (!accesible) {
      throw new BusinessException(
        ErrorCode.RECURSO_NO_ENCONTRADO,
        'La entidad no existe o no está disponible en su país de sesión',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private async isEntidadAccesible(
    entidadTipo: FijacionEntidadTipo,
    entidadId: number,
    paisSesionId: number,
  ): Promise<boolean> {
    switch (entidadTipo) {
      case FijacionEntidadTipo.PROCESO:
        return this.procesoRepository.exists({
          where: {
            id: entidadId,
            paisId: paisSesionId,
            eliminado: false,
          },
        });
      case FijacionEntidadTipo.PROYECCION:
        return this.proyeccionRepository.exists({
          where: {
            id: entidadId,
            paisId: paisSesionId,
            eliminado: false,
          },
        });
      case FijacionEntidadTipo.RELACIONAMIENTO: {
        const count = await this.relacionamientoRepository
          .createQueryBuilder('r')
          .innerJoin('r.contacto', 'co')
          .innerJoin('co.cliente', 'cl')
          .where('r.id = :entidadId', { entidadId })
          .andWhere('r.eliminado = false')
          .andWhere('cl.pais_id = :paisSesionId', { paisSesionId })
          .getCount();

        return count > 0;
      }
      default:
        return false;
    }
  }

  private async buildItem(
    fijacion: UsuarioFijacion,
    paisSesionId: number,
  ): Promise<BandejaItemDto | null> {
    switch (fijacion.entidadTipo) {
      case FijacionEntidadTipo.PROCESO:
        return this.buildProcesoItem(fijacion, paisSesionId);
      case FijacionEntidadTipo.PROYECCION:
        return this.buildProyeccionItem(fijacion, paisSesionId);
      case FijacionEntidadTipo.RELACIONAMIENTO:
        return this.buildRelacionamientoItem(fijacion, paisSesionId);
      default:
        return null;
    }
  }

  private buildUrgenciaFields(
    fecha: string | null | undefined,
    fechaRelevanteLabel: string,
  ): Pick<BandejaItemDto, 'fecha' | 'fechaRelevanteLabel' | 'diasRestantes' | 'urgencia'> {
    const fechaNormalizada = fecha
      ? normalizarFechaDesdeBd(fecha).fecha
      : '';
    const diasRestantes = diasHastaFecha(fechaNormalizada || null);

    return {
      fecha: fechaNormalizada,
      fechaRelevanteLabel,
      diasRestantes,
      urgencia: calcularUrgenciaBandeja(diasRestantes),
    };
  }

  private async buildProcesoItem(
    fijacion: UsuarioFijacion,
    paisSesionId: number,
  ): Promise<BandejaItemDto | null> {
    const entidadId = Number(fijacion.entidadId);
    const proceso = await this.procesoRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.empresaCliente', 'c')
      .where('p.id = :entidadId', { entidadId })
      .andWhere('p.pais_id = :paisSesionId', { paisSesionId })
      .andWhere('p.eliminado = false')
      .getOne();

    if (!proceso) return null;

    return {
      id: Number(proceso.id),
      entidadTipo: FijacionEntidadTipo.PROCESO,
      titulo: proceso.codigo ?? proceso.idDigitado,
      subtitulo: proceso.empresaCliente?.empresa ?? proceso.empresaOtro ?? null,
      estado: proceso.estado,
      ...this.buildUrgenciaFields(proceso.fechaCierre, 'Cierre'),
      icono: 'gavel',
      ruta: `/procesos/${proceso.id}`,
      fechaFijacion: this.formatFechaFijacion(fijacion.fechaFijacion),
    };
  }

  private async buildProyeccionItem(
    fijacion: UsuarioFijacion,
    paisSesionId: number,
  ): Promise<BandejaItemDto | null> {
    const rows = await this.dataSource.query(
      `SELECT v.id,
              v.fecha_estimada_publicacion AS fecha,
              COALESCE(v.empresa, v.proceso_codigo, CONCAT('Proyección #', v.id)) AS titulo,
              v.proceso_codigo AS procesoCodigo,
              v.empresa,
              v.objeto,
              v.estado
       FROM vista_proyecciones_listado v
       INNER JOIN proyecciones py ON py.id = v.id
       WHERE v.id = ?
         AND v.pais_id = ?
         AND py.eliminado = false
       LIMIT 1`,
      [fijacion.entidadId, paisSesionId],
    );

    const row = (rows as Array<Record<string, unknown>>)[0];
    if (!row) return null;

    const fecha = normalizarFechaDesdeBd(row.fecha as string | Date).fecha;

    return {
      id: Number(row.id),
      entidadTipo: FijacionEntidadTipo.PROYECCION,
      titulo: String(row.titulo),
      subtitulo: row.procesoCodigo ? `Proceso ${row.procesoCodigo}` : 'Manual',
      empresa: row.empresa ? String(row.empresa) : null,
      objeto: row.objeto ? String(row.objeto) : null,
      estado: String(row.estado),
      ...this.buildUrgenciaFields(fecha, 'Publicación est.'),
      icono: 'monitoring',
      ruta: `/proyecciones/${row.id}`,
      fechaFijacion: this.formatFechaFijacion(fijacion.fechaFijacion),
    };
  }

  private async buildRelacionamientoItem(
    fijacion: UsuarioFijacion,
    paisSesionId: number,
  ): Promise<BandejaItemDto | null> {
    const relacionamiento = await this.relacionamientoRepository
      .createQueryBuilder('r')
      .innerJoin('r.contacto', 'co')
      .innerJoin('co.cliente', 'cl')
      .where('r.id = :id', { id: fijacion.entidadId })
      .andWhere('r.eliminado = false')
      .andWhere('cl.pais_id = :paisSesionId', { paisSesionId })
      .getOne();

    if (!relacionamiento) return null;

    const usaReunion = Boolean(relacionamiento.fechaReunion);
    const fecha = usaReunion
      ? relacionamiento.fechaReunion
      : relacionamiento.fechaAlertaRespuesta;

    return {
      id: Number(relacionamiento.id),
      entidadTipo: FijacionEntidadTipo.RELACIONAMIENTO,
      titulo: relacionamiento.canal,
      subtitulo: relacionamiento.mensaje.slice(0, 80),
      estado: relacionamiento.resultado,
      ...this.buildUrgenciaFields(
        fecha,
        usaReunion ? 'Reunión' : 'Alerta sin respuesta',
      ),
      icono: 'handshake',
      ruta: `/crm/relacionamientos/${relacionamiento.id}`,
      fechaFijacion: this.formatFechaFijacion(fijacion.fechaFijacion),
    };
  }

  private sortByUrgencia(items: BandejaItemDto[]): BandejaItemDto[] {
    return [...items].sort((a, b) => {
      const urgenciaDiff =
        BANDEJA_URGENCIA_ORDEN[a.urgencia] - BANDEJA_URGENCIA_ORDEN[b.urgencia];
      if (urgenciaDiff !== 0) return urgenciaDiff;

      const diasA = a.diasRestantes ?? Number.MAX_SAFE_INTEGER;
      const diasB = b.diasRestantes ?? Number.MAX_SAFE_INTEGER;
      if (diasA !== diasB) return diasA - diasB;

      return b.fechaFijacion.localeCompare(a.fechaFijacion);
    });
  }

  private buildResumen(
    procesos: BandejaItemDto[],
    proyecciones: BandejaItemDto[],
    relacionamientos: BandejaItemDto[],
  ): BandejaResumenDto {
    const all = [...procesos, ...proyecciones, ...relacionamientos];

    return {
      totalFijados: all.length,
      totalProcesos: procesos.length,
      totalProyecciones: proyecciones.length,
      totalRelacionamientos: relacionamientos.length,
      urgentes: all.filter((item) => item.urgencia === BandejaUrgencia.ALTA).length,
      vencidos: all.filter(
        (item) => item.diasRestantes !== null && item.diasRestantes < 0,
      ).length,
      porUrgencia: this.countByKey(all, (item) => item.urgencia),
      porEstadoProcesos: this.countByKey(procesos, (item) => item.estado),
    };
  }

  private countByKey(
    items: BandejaItemDto[],
    keyFn: (item: BandejaItemDto) => string,
  ): BandejaResumenConteoDto[] {
    const totals = new Map<string, number>();

    for (const item of items) {
      const key = keyFn(item);
      totals.set(key, (totals.get(key) ?? 0) + 1);
    }

    return [...totals.entries()]
      .map(([clave, total]) => ({ clave, total }))
      .sort((a, b) => a.clave.localeCompare(b.clave, 'es'));
  }

  private formatFechaFijacion(fecha: Date | string): string {
    if (fecha instanceof Date) {
      return fecha.toISOString();
    }

    return new Date(fecha).toISOString();
  }
}
