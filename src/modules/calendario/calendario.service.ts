import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EstadoProceso } from '../../common/enums/estado-proceso.enum';
import { ResultadoRelacionamiento } from '../../common/enums/resultado-relacionamiento.enum';
import { normalizarFechaDesdeBd } from '../../common/utils/proceso-fechas.util';
import { Proceso } from '../../database/entities/proceso.entity';
import { Proyeccion } from '../../database/entities/proyeccion.entity';
import { Relacionamiento } from '../../database/entities/relacionamiento.entity';
import {
  CalendarioEventoDto,
  CalendarioEventoTipo,
  CalendarioEventosQueryDto,
} from './dto/calendario-eventos.dto';

const TIPOS_DEFAULT: CalendarioEventoTipo[] = [
  CalendarioEventoTipo.PROYECCION,
  CalendarioEventoTipo.PROCESO,
  CalendarioEventoTipo.RELACIONAMIENTO,
];

@Injectable()
export class CalendarioService {
  constructor(
    @InjectRepository(Proyeccion)
    private readonly proyeccionRepository: Repository<Proyeccion>,
    @InjectRepository(Proceso)
    private readonly procesoRepository: Repository<Proceso>,
    @InjectRepository(Relacionamiento)
    private readonly relacionamientoRepository: Repository<Relacionamiento>,
    private readonly dataSource: DataSource,
  ) {}

  async getEventos(
    query: CalendarioEventosQueryDto,
    paisSesionId: number,
  ): Promise<CalendarioEventoDto[]> {
    const tipos = query.tipos?.length ? query.tipos : TIPOS_DEFAULT;
    const eventos: CalendarioEventoDto[] = [];

    if (tipos.includes(CalendarioEventoTipo.PROYECCION)) {
      eventos.push(...(await this.getProyecciones(query.anio, paisSesionId)));
    }

    if (tipos.includes(CalendarioEventoTipo.PROCESO)) {
      eventos.push(...(await this.getProcesos(query.anio, paisSesionId)));
    }

    if (tipos.includes(CalendarioEventoTipo.RELACIONAMIENTO)) {
      eventos.push(...(await this.getRelacionamientos(query.anio, paisSesionId)));
    }

    return eventos.sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  private async getProyecciones(
    anio: number,
    paisSesionId: number,
  ): Promise<CalendarioEventoDto[]> {
    const rows = await this.dataSource.query(
      `SELECT v.id,
              v.fecha_estimada_publicacion AS fecha,
              COALESCE(v.empresa, v.proceso_codigo, CONCAT('Proyección #', v.id)) AS titulo,
              v.proceso_codigo AS procesoCodigo,
              v.estado
       FROM vista_proyecciones_listado v
       INNER JOIN proyecciones py ON py.id = v.id
       WHERE v.pais_id = ?
         AND py.eliminado = false
         AND v.anio_proyectado = ?
       ORDER BY v.fecha_estimada_publicacion ASC
       LIMIT 500`,
      [paisSesionId, anio],
    );

    return (rows as Array<Record<string, unknown>>).map((row) => ({
      id: Number(row.id),
      tipo: CalendarioEventoTipo.PROYECCION,
      fecha: normalizarFechaDesdeBd(row.fecha as string | Date).fecha,
      titulo: String(row.titulo),
      subtitulo: row.procesoCodigo ? `Proceso ${row.procesoCodigo}` : 'Manual',
      estado: String(row.estado),
      icono: 'monitoring',
    }));
  }

  private async getProcesos(
    anio: number,
    paisSesionId: number,
  ): Promise<CalendarioEventoDto[]> {
    const rows = await this.procesoRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.empresaCliente', 'c')
      .where('p.eliminado = false')
      .andWhere('p.pais_id = :paisSesionId', { paisSesionId })
      .andWhere('p.estado NOT IN (:...estados)', {
        estados: [EstadoProceso.DESCARTADO, EstadoProceso.CERRADO],
      })
      .andWhere('YEAR(p.fecha_cierre) = :anio', { anio })
      .orderBy('p.fecha_cierre', 'ASC')
      .take(500)
      .getMany();

    return rows.map((row) => ({
      id: Number(row.id),
      tipo: CalendarioEventoTipo.PROCESO,
      fecha: row.fechaCierre,
      titulo: row.codigo ?? row.idDigitado,
      subtitulo: row.empresaCliente?.empresa ?? row.empresaOtro ?? null,
      estado: row.estado,
      icono: 'gavel',
    }));
  }

  private async getRelacionamientos(
    anio: number,
    paisSesionId: number,
  ): Promise<CalendarioEventoDto[]> {
    const rows = await this.relacionamientoRepository
      .createQueryBuilder('r')
      .innerJoin('r.contacto', 'co')
      .innerJoin('co.cliente', 'cl')
      .where('r.eliminado = false')
      .andWhere('cl.pais_id = :paisSesionId', { paisSesionId })
      .andWhere('r.resultado = :resultado', {
        resultado: ResultadoRelacionamiento.REUNION_PROGRAMADA,
      })
      .andWhere('r.fecha_reunion IS NOT NULL')
      .andWhere('YEAR(r.fecha_reunion) = :anio', { anio })
      .orderBy('r.fecha_reunion', 'ASC')
      .take(500)
      .getMany();

    return rows.map((row) => ({
      id: Number(row.id),
      tipo: CalendarioEventoTipo.RELACIONAMIENTO,
      fecha: row.fechaReunion!,
      titulo: row.canal,
      subtitulo: row.mensaje.slice(0, 80),
      estado: row.resultado,
      icono: 'handshake',
    }));
  }
}
