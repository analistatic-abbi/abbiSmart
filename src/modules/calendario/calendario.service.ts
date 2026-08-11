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
  CalendarioEventoTipo.KAM,
  CalendarioEventoTipo.REUNION_ACLARATORIA,
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

    if (tipos.includes(CalendarioEventoTipo.KAM)) {
      eventos.push(...(await this.getKamReuniones(query.anio, paisSesionId)));
    }

    if (tipos.includes(CalendarioEventoTipo.REUNION_ACLARATORIA)) {
      eventos.push(...(await this.getReunionesAclaratorias(query.anio, paisSesionId)));
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
              v.empresa,
              v.objeto,
              v.valor_venta AS valorVenta,
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
      empresa: row.empresa ? String(row.empresa) : null,
      objeto: row.objeto ? String(row.objeto) : null,
      valor: row.valorVenta ? String(row.valorVenta) : null,
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
      .innerJoinAndSelect('r.contacto', 'co')
      .innerJoinAndSelect('co.cliente', 'cl')
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

    return rows.map((row) => {
      const empresa = row.contacto.cliente.empresa;
      const contacto = row.contacto.nombre;
      const cargo = row.contacto.cargo?.trim() || null;

      return {
        id: Number(row.id),
        tipo: CalendarioEventoTipo.RELACIONAMIENTO,
        fecha: row.fechaReunion!,
        titulo: contacto,
        subtitulo: empresa,
        detalle: cargo,
        empresa,
        estado: row.resultado,
        icono: 'handshake',
      };
    });
  }

  private async getKamReuniones(
    anio: number,
    paisSesionId: number,
  ): Promise<CalendarioEventoDto[]> {
    const rows = await this.dataSource.query(
      `SELECT k.id AS kamId,
              r.id AS rondaId,
              r.numero AS rondaNumero,
              p.codigo AS procesoCodigo,
              p.objeto AS procesoObjeto,
              c.empresa AS empresaMostrar,
              r.estado,
              r.fecha_reunion_socializacion AS fecha
       FROM kam_rondas r
       INNER JOIN kams k ON k.id = r.kam_id
       INNER JOIN procesos p ON p.id = k.proceso_id
       INNER JOIN clientes c ON c.id = k.empresa_cliente_id
       WHERE k.pais_id = ?
         AND r.fecha_reunion_socializacion IS NOT NULL
         AND YEAR(r.fecha_reunion_socializacion) = ?
       ORDER BY r.fecha_reunion_socializacion ASC
       LIMIT 500`,
      [paisSesionId, anio],
    );

    return (rows as Array<Record<string, unknown>>).map((row) => {
      const empresa = String(row.empresaMostrar);
      const procesoCodigo = row.procesoCodigo ? String(row.procesoCodigo) : null;
      const procesoObjeto = row.procesoObjeto ? String(row.procesoObjeto).trim() : null;
      const rondaNumero = Number(row.rondaNumero);
      const estado = String(row.estado);
      const detallePartes = [
        `Ronda ${rondaNumero}`,
        procesoObjeto ? this.recortarTexto(procesoObjeto, 60) : null,
      ].filter(Boolean);

      return {
        id: Number(row.rondaId),
        kamId: Number(row.kamId),
        tipo: CalendarioEventoTipo.KAM,
        fecha: normalizarFechaDesdeBd(row.fecha as string | Date).fecha,
        titulo: empresa,
        subtitulo: procesoCodigo ?? `Ronda ${rondaNumero}`,
        detalle: detallePartes.join(' · '),
        empresa,
        estado,
        icono: 'groups',
      };
    });
  }

  private async getReunionesAclaratorias(
    anio: number,
    paisSesionId: number,
  ): Promise<CalendarioEventoDto[]> {
    const rows = await this.procesoRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.empresaCliente', 'c')
      .where('p.eliminado = false')
      .andWhere('p.pais_id = :paisSesionId', { paisSesionId })
      .andWhere('p.fecha_reunion_aclaratoria IS NOT NULL')
      .andWhere('YEAR(p.fecha_reunion_aclaratoria) = :anio', { anio })
      .orderBy('p.fecha_reunion_aclaratoria', 'ASC')
      .take(500)
      .getMany();

    return rows.map((row) => {
      const empresa = row.empresaCliente?.empresa ?? row.empresaOtro ?? 'Sin empresa';
      const proceso = row.codigo ?? row.idDigitado;
      const objeto = row.objeto?.trim() || null;

      return {
        id: Number(row.id),
        tipo: CalendarioEventoTipo.REUNION_ACLARATORIA,
        fecha: row.fechaReunionAclaratoria!,
        titulo: empresa,
        subtitulo: proceso,
        detalle: objeto ? this.recortarTexto(objeto, 80) : null,
        empresa: row.empresaCliente?.empresa ?? row.empresaOtro ?? null,
        estado: row.estado,
        icono: 'forum',
      };
    });
  }

  private recortarTexto(texto: string, max: number): string {
    if (texto.length <= max) return texto;
    return `${texto.slice(0, max - 1).trimEnd()}…`;
  }
}
