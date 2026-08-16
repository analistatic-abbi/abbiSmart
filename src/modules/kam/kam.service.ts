import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource, In, Repository } from 'typeorm';
import {
  AuditAccion,
  AuditEntidadTipo,
} from '../../common/enums/audit-accion.enum';
import { EstadoKamRonda } from '../../common/enums/estado-kam-ronda.enum';
import { EstadoProceso } from '../../common/enums/estado-proceso.enum';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { Rol } from '../../common/enums/rol.enum';
import { PermisosService } from '../../common/services/permisos.service';
import { FormatoEncuestaItem } from '../../database/entities/formato-encuesta-item.entity';
import { FormatoEncuestaSeccion } from '../../database/entities/formato-encuesta-seccion.entity';
import { FormatoEncuesta } from '../../database/entities/formato-encuesta.entity';
import { KamEncuestaContacto } from '../../database/entities/kam-encuesta-contacto.entity';
import { KamEncuestaRespuesta } from '../../database/entities/kam-encuesta-respuesta.entity';
import { KamEncuesta } from '../../database/entities/kam-encuesta.entity';
import { KamRondaBitacora } from '../../database/entities/kam-ronda-bitacora.entity';
import { KamRondaCorrespondencia } from '../../database/entities/kam-ronda-correspondencia.entity';
import { KamRonda } from '../../database/entities/kam-ronda.entity';
import { Kam } from '../../database/entities/kam.entity';
import { ProcesoContacto } from '../../database/entities/proceso-contacto.entity';
import { Proceso } from '../../database/entities/proceso.entity';
import { AuditService } from '../audit/audit.service';
import {
  agregarResumenes,
  calcularResumenDesdeItems,
  ResumenEncuesta,
} from '../formatos-encuesta/veredicto.util';
import {
  BitacoraRondaDto,
  CreateBitacoraEntradaDto,
  CrearEncuestaDto,
  GuardarRespuestasEncuestaDto,
  KamBitacoraEntradaDto,
  KamCalendarioEventoDto,
  KamDetailDto,
  KamEncuestaResponseDto,
  KamListItemDto,
  KamQueryDto,
  KamResponseDto,
  KamRondaResponseDto,
  ReunionRondaDto,
  UpdateVeredictoDto,
} from './dto/kam.dto';

export interface KamPage {
  data: KamListItemDto[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class KamService {
  constructor(
    @InjectRepository(Kam)
    private readonly kamRepository: Repository<Kam>,
    @InjectRepository(KamRonda)
    private readonly rondaRepository: Repository<KamRonda>,
    @InjectRepository(KamRondaCorrespondencia)
    private readonly correspondenciaRepository: Repository<KamRondaCorrespondencia>,
    @InjectRepository(KamRondaBitacora)
    private readonly bitacoraRepository: Repository<KamRondaBitacora>,
    @InjectRepository(KamEncuesta)
    private readonly encuestaRepository: Repository<KamEncuesta>,
    @InjectRepository(KamEncuestaContacto)
    private readonly encuestaContactoRepository: Repository<KamEncuestaContacto>,
    @InjectRepository(KamEncuestaRespuesta)
    private readonly respuestaRepository: Repository<KamEncuestaRespuesta>,
    @InjectRepository(Proceso)
    private readonly procesoRepository: Repository<Proceso>,
    @InjectRepository(ProcesoContacto)
    private readonly procesoContactoRepository: Repository<ProcesoContacto>,
    @InjectRepository(FormatoEncuesta)
    private readonly formatoRepository: Repository<FormatoEncuesta>,
    @InjectRepository(FormatoEncuestaSeccion)
    private readonly seccionRepository: Repository<FormatoEncuestaSeccion>,
    @InjectRepository(FormatoEncuestaItem)
    private readonly itemRepository: Repository<FormatoEncuestaItem>,
    private readonly auditService: AuditService,
    private readonly permisosService: PermisosService,
    private readonly dataSource: DataSource,
  ) {}

  async generarDesdeProcesoAdjudicado(
    procesoId: number,
    actorId: number,
  ): Promise<KamResponseDto | null> {
    const proceso = await this.procesoRepository.findOne({
      where: { id: procesoId, eliminado: false },
    });

    if (
      !proceso ||
      proceso.estado !== EstadoProceso.ADJUDICADO ||
      !proceso.empresaClienteId
    ) {
      return null;
    }

    const existente = await this.kamRepository.findOne({ where: { procesoId } });
    if (existente) {
      await this.asegurarPrimeraRonda(existente.id, actorId);
      return this.toResponse(existente);
    }

    const saved = await this.kamRepository.save(
      this.kamRepository.create({
        procesoId: proceso.id,
        paisId: proceso.paisId,
        empresaClienteId: proceso.empresaClienteId,
        creadoPorId: actorId,
      }),
    );

    await this.crearPrimeraRonda(saved.id, actorId);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.KAM_CREAR_AUTO,
      entidadTipo: AuditEntidadTipo.KAM,
      entidadId: saved.id,
      valorNuevo: JSON.stringify({
        procesoId: proceso.id,
        empresaClienteId: proceso.empresaClienteId,
      }),
    });

    return this.toResponse(saved);
  }

  async findAll(query: KamQueryDto, paisSesionId: number): Promise<KamPage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const params: unknown[] = [paisSesionId];
    let where = 'k.pais_id = ?';

    if (query.search?.trim()) {
      where +=
        ' AND (p.codigo LIKE ? OR p.id_digitado LIKE ? OR c.empresa LIKE ? OR p.objeto LIKE ?)';
      const term = `%${query.search.trim()}%`;
      params.push(term, term, term, term);
    }

    if (query.estadoRonda) {
      where += ' AND r.estado = ?';
      params.push(query.estadoRonda);
    }

    if (query.sinReunionAgendada) {
      where += ' AND r.estado = ? AND r.fecha_reunion_socializacion IS NULL';
      params.push(EstadoKamRonda.Ejecutado);
    }

    const countRows = await this.kamRepository.query(
      `SELECT COUNT(DISTINCT k.id) AS total
       FROM kams k
       INNER JOIN procesos p ON p.id = k.proceso_id
       INNER JOIN clientes c ON c.id = k.empresa_cliente_id
       LEFT JOIN kam_rondas r ON r.kam_id = k.id
         AND r.numero = (
           SELECT MAX(r2.numero) FROM kam_rondas r2 WHERE r2.kam_id = k.id
         )
       WHERE ${where}`,
      params,
    );

    const rows = await this.kamRepository.query(
      `SELECT k.id, k.proceso_id AS procesoId, p.codigo AS procesoCodigo,
              p.id_digitado AS procesoIdDigitado, p.objeto AS procesoObjeto,
              c.empresa AS empresaMostrar,
              r.numero AS rondaActualNumero, r.estado AS rondaActualEstado,
              r.fecha_reunion_socializacion AS fechaReunionSocializacion
       FROM kams k
       INNER JOIN procesos p ON p.id = k.proceso_id
       INNER JOIN clientes c ON c.id = k.empresa_cliente_id
       LEFT JOIN kam_rondas r ON r.kam_id = k.id
         AND r.numero = (
           SELECT MAX(r2.numero) FROM kam_rondas r2 WHERE r2.kam_id = k.id
         )
       WHERE ${where}
       ORDER BY k.fecha_creacion DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    return {
      data: rows.map((row: Record<string, unknown>) => ({
        id: Number(row.id),
        procesoId: Number(row.procesoId),
        procesoCodigo: (row.procesoCodigo as string | null) ?? null,
        procesoIdDigitado: String(row.procesoIdDigitado),
        procesoObjeto: row.procesoObjeto ? String(row.procesoObjeto) : null,
        empresaMostrar: String(row.empresaMostrar),
        rondaActualNumero:
          row.rondaActualNumero !== null && row.rondaActualNumero !== undefined
            ? Number(row.rondaActualNumero)
            : null,
        rondaActualEstado: (row.rondaActualEstado as EstadoKamRonda | null) ?? null,
        fechaReunionSocializacion: row.fechaReunionSocializacion
          ? this.toDateOnlyString(row.fechaReunionSocializacion)
          : null,
      })),
      total: Number(countRows[0]?.total ?? 0),
      page,
      limit,
    };
  }

  async findById(id: number, paisSesionId: number): Promise<KamDetailDto> {
    const kam = await this.getKamOrFail(id, paisSesionId);
    return this.buildDetail(kam);
  }

  async findByProcesoId(
    procesoId: number,
    paisSesionId: number,
  ): Promise<KamDetailDto | null> {
    const kam = await this.kamRepository.findOne({ where: { procesoId, paisId: paisSesionId } });
    return kam ? this.buildDetail(kam) : null;
  }

  async getCalendario(
    paisSesionId: number,
    anio = new Date().getFullYear(),
  ): Promise<KamCalendarioEventoDto[]> {
    const rows = await this.rondaRepository.query(
      `SELECT k.id AS kamId, r.id AS rondaId, p.codigo AS procesoCodigo,
              p.objeto AS procesoObjeto,
              c.empresa AS empresaMostrar, r.estado,
              r.fecha_reunion_socializacion AS fechaReunion,
              DATEDIFF(r.fecha_reunion_socializacion, CURDATE()) AS diasRestantes
       FROM kam_rondas r
       INNER JOIN kams k ON k.id = r.kam_id
       INNER JOIN procesos p ON p.id = k.proceso_id
       INNER JOIN clientes c ON c.id = k.empresa_cliente_id
       WHERE k.pais_id = ?
         AND r.fecha_reunion_socializacion IS NOT NULL
         AND YEAR(r.fecha_reunion_socializacion) = ?`,
      [paisSesionId, anio],
    );

    return (rows as Array<Record<string, unknown>>)
      .map((row) => ({
        kamId: Number(row.kamId),
        rondaId: Number(row.rondaId),
        procesoCodigo: (row.procesoCodigo as string | null) ?? null,
        procesoObjeto: row.procesoObjeto ? String(row.procesoObjeto) : null,
        empresaMostrar: String(row.empresaMostrar),
        tipo: 'reunion' as const,
        fecha: this.toDateOnlyString(row.fechaReunion),
        estado: row.estado as EstadoKamRonda,
        diasRestantes: Number(row.diasRestantes ?? 0),
      }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  async crearRonda(
    kamId: number,
    actorId: number,
    paisSesionId: number,
    rol: Rol,
  ): Promise<KamRondaResponseDto> {
    this.assertPuedeGestionar(rol);
    const kam = await this.getKamOrFail(kamId, paisSesionId);

    const max = await this.rondaRepository
      .createQueryBuilder('ronda')
      .select('MAX(ronda.numero)', 'max')
      .where('ronda.kamId = :kamId', { kamId: kam.id })
      .getRawOne<{ max: string | null }>();

    const numero = Number(max?.max ?? 0) + 1;

    const ronda = await this.rondaRepository.save(
      this.rondaRepository.create({
        kamId: kam.id,
        numero,
        estado: EstadoKamRonda.Pendiente,
      }),
    );

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.KAM_RONDA_CREAR,
      entidadTipo: AuditEntidadTipo.KAM,
      entidadId: kam.id,
      valorNuevo: JSON.stringify({ rondaId: ronda.id, numero }),
    });

    return await this.toRondaResponse(ronda, []);
  }

  async agregarBitacora(
    kamId: number,
    rondaId: number,
    dto: CreateBitacoraEntradaDto | BitacoraRondaDto,
    actorId: number,
    paisSesionId: number,
    rol: Rol,
  ): Promise<KamRondaResponseDto> {
    this.assertPuedeGestionar(rol);
    const ronda = await this.getRondaOrFail(kamId, rondaId, paisSesionId);

    const texto =
      'texto' in dto && typeof dto.texto === 'string'
        ? dto.texto.trim()
        : (dto as BitacoraRondaDto).bitacora?.trim() ?? '';

    if (!texto) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        'El comentario no puede estar vacío',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.bitacoraRepository.save(
      this.bitacoraRepository.create({
        rondaId: ronda.id,
        usuarioId: actorId,
        texto,
      }),
    );

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.KAM_RONDA_EDITAR,
      entidadTipo: AuditEntidadTipo.KAM,
      entidadId: kamId,
      valorNuevo: JSON.stringify({ rondaId, bitacoraEntrada: true }),
    });

    return await this.toRondaResponse(ronda, await this.loadEncuestas(ronda.id));
  }

  /** @deprecated usar agregarBitacora */
  async updateBitacora(
    kamId: number,
    rondaId: number,
    dto: BitacoraRondaDto,
    actorId: number,
    paisSesionId: number,
    rol: Rol,
  ): Promise<KamRondaResponseDto> {
    return this.agregarBitacora(kamId, rondaId, dto, actorId, paisSesionId, rol);
  }

  async subirCorrespondencia(
    kamId: number,
    rondaId: number,
    archivos: Express.Multer.File[],
    actorId: number,
    paisSesionId: number,
    rol: Rol,
  ): Promise<KamRondaResponseDto> {
    this.assertPuedeGestionar(rol);
    const ronda = await this.getRondaOrFail(kamId, rondaId, paisSesionId);

    if (!archivos.length) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        'Debe adjuntar al menos un archivo',
        HttpStatus.BAD_REQUEST,
      );
    }

    const nombres: string[] = [];
    for (const archivo of archivos) {
      const savedFile = await this.guardarArchivo(kamId, rondaId, archivo);
      await this.correspondenciaRepository.save(
        this.correspondenciaRepository.create({
          rondaId: ronda.id,
          nombre: savedFile.nombre,
          ruta: savedFile.rutaRelativa,
        }),
      );
      nombres.push(savedFile.nombre);
    }

    // Compatibilidad con columnas legacy (último archivo)
    const ultimo = nombres[nombres.length - 1];
    const ultima = await this.correspondenciaRepository.findOne({
      where: { rondaId: ronda.id },
      order: { id: 'DESC' },
    });
    if (ultima) {
      ronda.correspondenciaNombre = ultima.nombre;
      ronda.correspondenciaRuta = ultima.ruta;
      await this.rondaRepository.save(ronda);
    }

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.KAM_RONDA_EDITAR,
      entidadTipo: AuditEntidadTipo.KAM,
      entidadId: kamId,
      valorNuevo: JSON.stringify({ rondaId, correspondencias: nombres }),
    });

    return await this.toRondaResponse(ronda, await this.loadEncuestas(ronda.id));
  }

  async eliminarCorrespondencia(
    kamId: number,
    rondaId: number,
    actorId: number,
    paisSesionId: number,
    rol: Rol,
    archivoId?: number,
  ): Promise<KamRondaResponseDto> {
    this.assertPuedeGestionar(rol);
    const ronda = await this.getRondaOrFail(kamId, rondaId, paisSesionId);

    if (archivoId != null) {
      const item = await this.correspondenciaRepository.findOne({
        where: { id: archivoId, rondaId: ronda.id },
      });
      if (!item) {
        throw new BusinessException(
          ErrorCode.KAM_RONDA_NO_ENCONTRADA,
          'Archivo de correspondencia no encontrado',
          HttpStatus.NOT_FOUND,
        );
      }
      await this.eliminarArchivo(item.ruta);
      await this.correspondenciaRepository.delete({ id: item.id });
    } else {
      const items = await this.correspondenciaRepository.find({
        where: { rondaId: ronda.id },
      });
      for (const item of items) {
        await this.eliminarArchivo(item.ruta);
      }
      await this.correspondenciaRepository.delete({ rondaId: ronda.id });
      if (ronda.correspondenciaRuta) {
        await this.eliminarArchivo(ronda.correspondenciaRuta);
      }
    }

    const restantes = await this.correspondenciaRepository.find({
      where: { rondaId: ronda.id },
      order: { id: 'DESC' },
    });
    ronda.correspondenciaNombre = restantes[0]?.nombre ?? null;
    ronda.correspondenciaRuta = restantes[0]?.ruta ?? null;
    const saved = await this.rondaRepository.save(ronda);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.KAM_RONDA_EDITAR,
      entidadTipo: AuditEntidadTipo.KAM,
      entidadId: kamId,
      valorNuevo: JSON.stringify({
        rondaId,
        correspondenciaEliminada: archivoId ?? 'todas',
      }),
    });

    return await this.toRondaResponse(saved, await this.loadEncuestas(saved.id));
  }

  getCorrespondenciaPath(
    kamId: number,
    rondaId: number,
    paisSesionId: number,
    archivoId?: number,
  ): Promise<{ rutaAbsoluta: string; nombre: string }> {
    return this.getRondaOrFail(kamId, rondaId, paisSesionId).then(async (ronda) => {
      let item: KamRondaCorrespondencia | null = null;

      if (archivoId != null) {
        item = await this.correspondenciaRepository.findOne({
          where: { id: archivoId, rondaId: ronda.id },
        });
      } else {
        item = await this.correspondenciaRepository.findOne({
          where: { rondaId: ronda.id },
          order: { id: 'ASC' },
        });
      }

      if (!item) {
        if (!archivoId && ronda.correspondenciaRuta && ronda.correspondenciaNombre) {
          return {
            rutaAbsoluta: path.join(process.cwd(), ronda.correspondenciaRuta),
            nombre: ronda.correspondenciaNombre,
          };
        }
        throw new BusinessException(
          ErrorCode.KAM_RONDA_NO_ENCONTRADA,
          'La ronda no tiene correspondencia adjunta',
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        rutaAbsoluta: path.join(process.cwd(), item.ruta),
        nombre: item.nombre,
      };
    });
  }

  async crearEncuesta(
    kamId: number,
    rondaId: number,
    dto: CrearEncuestaDto,
    actorId: number,
    paisSesionId: number,
    rol: Rol,
  ): Promise<KamEncuestaResponseDto> {
    this.assertPuedeGestionar(rol);
    const kam = await this.getKamOrFail(kamId, paisSesionId);
    const ronda = await this.getRondaOrFail(kamId, rondaId, paisSesionId);
    this.assertRondaPendiente(ronda);

    const formato = await this.formatoRepository.findOne({
      where: { id: dto.formatoEncuestaId, paisId: paisSesionId, activo: true },
      relations: {
        secciones: { preguntas: { items: true } },
      },
    });

    const totalItems =
      formato?.secciones?.reduce(
        (acc, seccion) =>
          acc +
          (seccion.preguntas?.reduce((a, p) => a + (p.items?.length ?? 0), 0) ?? 0),
        0,
      ) ?? 0;

    if (!formato || totalItems === 0) {
      throw new BusinessException(
        ErrorCode.FORMATO_ENCUESTA_NO_ENCONTRADO,
        'Formato de encuesta no encontrado o sin ítems respondibles',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.assertContactosDelProceso(kam.procesoId, [dto.contactoId]);

    const duplicada = await this.encuestaRepository
      .createQueryBuilder('encuesta')
      .innerJoin('encuesta.contactos', 'contacto')
      .where('encuesta.rondaId = :rondaId', { rondaId: ronda.id })
      .andWhere('encuesta.formatoEncuestaId = :formatoId', { formatoId: formato.id })
      .andWhere('contacto.contactoId = :contactoId', { contactoId: dto.contactoId })
      .getOne();

    if (duplicada) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        'Ya existe una encuesta con ese formato para el contacto seleccionado',
        HttpStatus.BAD_REQUEST,
      );
    }

    const encuesta = await this.dataSource.transaction(async (manager) => {
      const savedEncuesta = await manager.save(
        manager.create(KamEncuesta, {
          rondaId: ronda.id,
          formatoEncuestaId: formato.id,
        }),
      );

      await manager.save(
        manager.create(KamEncuestaContacto, {
          encuestaId: savedEncuesta.id,
          contactoId: dto.contactoId,
        }),
      );

      return savedEncuesta;
    });

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.KAM_ENCUESTA_CREAR,
      entidadTipo: AuditEntidadTipo.KAM,
      entidadId: kamId,
      valorNuevo: JSON.stringify({
        encuestaId: encuesta.id,
        formatoId: formato.id,
        contactoId: dto.contactoId,
      }),
    });

    const encuestas = await this.loadEncuestas(ronda.id);
    return encuestas.find((item) => item.id === encuesta.id)!;
  }

  async guardarRespuestas(
    kamId: number,
    rondaId: number,
    encuestaId: number,
    dto: GuardarRespuestasEncuestaDto,
    actorId: number,
    paisSesionId: number,
    rol: Rol,
  ): Promise<KamEncuestaResponseDto> {
    this.assertPuedeGestionar(rol);
    const kam = await this.getKamOrFail(kamId, paisSesionId);
    const ronda = await this.getRondaOrFail(kamId, rondaId, paisSesionId);
    this.assertRondaPendiente(ronda);

    const encuesta = await this.encuestaRepository.findOne({
      where: { id: encuestaId, rondaId: ronda.id },
      relations: {
        formato: { secciones: { preguntas: { items: true } } },
        contactos: true,
      },
    });

    if (!encuesta) {
      throw new BusinessException(
        ErrorCode.KAM_ENCUESTA_NO_ENCONTRADA,
        'Encuesta no encontrada en la ronda',
        HttpStatus.NOT_FOUND,
      );
    }

    const contactoAsociado = encuesta.contactos.some(
      (item) => Number(item.contactoId) === Number(dto.contactoId),
    );

    if (!contactoAsociado) {
      throw new BusinessException(
        ErrorCode.KAM_CONTACTO_INVALIDO,
        'El contacto no está asociado a esta encuesta',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.assertContactosDelProceso(kam.procesoId, [dto.contactoId]);

    const items = this.flattenItems(encuesta.formato.secciones ?? []);
    const itemById = new Map(items.map((item) => [Number(item.id), item]));

    for (const respuesta of dto.respuestas) {
      const item = itemById.get(Number(respuesta.itemId));
      if (!item) {
        throw new BusinessException(
          ErrorCode.VALIDATION_ERROR,
          `El ítem ${respuesta.itemId} no pertenece al formato`,
          HttpStatus.BAD_REQUEST,
        );
      }
      if (item.requiereCalificacion) {
        if (respuesta.puntaje == null || respuesta.puntaje < 1 || respuesta.puntaje > 5) {
          throw new BusinessException(
            ErrorCode.VALIDATION_ERROR,
            `El ítem ${respuesta.itemId} requiere calificación entre 1 y 5`,
            HttpStatus.BAD_REQUEST,
          );
        }
      } else if (!respuesta.observacion?.trim()) {
        throw new BusinessException(
          ErrorCode.VALIDATION_ERROR,
          `El ítem ${respuesta.itemId} es solo de observación y requiere un comentario`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(KamEncuestaRespuesta, {
        encuestaId: encuesta.id,
        contactoId: dto.contactoId,
      });

      for (const respuesta of dto.respuestas) {
        const item = itemById.get(Number(respuesta.itemId))!;
        await manager.save(
          manager.create(KamEncuestaRespuesta, {
            encuestaId: encuesta.id,
            contactoId: dto.contactoId,
            itemId: respuesta.itemId,
            puntaje: item.requiereCalificacion ? respuesta.puntaje ?? null : null,
            observacion: respuesta.observacion?.trim() ?? null,
          }),
        );
      }

      const resumen = this.calcularResumenFormato(
        encuesta.formato.secciones ?? [],
        dto.respuestas.map((r) => ({
          itemId: r.itemId,
          puntaje: r.puntaje ?? null,
        })),
      );

      if (!encuesta.veredictoEditado) {
        encuesta.veredicto = resumen.veredictoSugerido;
        await manager.save(encuesta);
      }
    });

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.KAM_ENCUESTA_RESPONDER,
      entidadTipo: AuditEntidadTipo.KAM,
      entidadId: kamId,
      valorNuevo: JSON.stringify({
        encuestaId,
        contactoId: dto.contactoId,
        respuestas: dto.respuestas.length,
      }),
    });

    await this.maybeRefreshVeredictoRonda(ronda);

    const encuestas = await this.loadEncuestas(ronda.id);
    return encuestas.find((item) => item.id === encuesta.id)!;
  }

  async updateVeredictoEncuesta(
    kamId: number,
    rondaId: number,
    encuestaId: number,
    dto: UpdateVeredictoDto,
    actorId: number,
    paisSesionId: number,
    rol: Rol,
  ): Promise<KamEncuestaResponseDto> {
    this.assertPuedeGestionar(rol);
    await this.getKamOrFail(kamId, paisSesionId);
    const ronda = await this.getRondaOrFail(kamId, rondaId, paisSesionId);
    const encuesta = await this.encuestaRepository.findOne({
      where: { id: encuestaId, rondaId: ronda.id },
    });
    if (!encuesta) {
      throw new BusinessException(
        ErrorCode.KAM_ENCUESTA_NO_ENCONTRADA,
        'Encuesta no encontrada en la ronda',
        HttpStatus.NOT_FOUND,
      );
    }

    encuesta.veredicto = dto.veredicto.trim();
    encuesta.veredictoEditado = true;
    await this.encuestaRepository.save(encuesta);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.KAM_ENCUESTA_RESPONDER,
      entidadTipo: AuditEntidadTipo.KAM,
      entidadId: kamId,
      valorNuevo: JSON.stringify({ encuestaId, veredictoEditado: true }),
    });

    const encuestas = await this.loadEncuestas(ronda.id);
    return encuestas.find((item) => item.id === encuesta.id)!;
  }

  async updateVeredictoRonda(
    kamId: number,
    rondaId: number,
    dto: UpdateVeredictoDto,
    actorId: number,
    paisSesionId: number,
    rol: Rol,
  ): Promise<KamRondaResponseDto> {
    this.assertPuedeGestionar(rol);
    await this.getKamOrFail(kamId, paisSesionId);
    const ronda = await this.getRondaOrFail(kamId, rondaId, paisSesionId);
    ronda.veredicto = dto.veredicto.trim();
    ronda.veredictoEditado = true;
    const saved = await this.rondaRepository.save(ronda);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.KAM_RONDA_EDITAR,
      entidadTipo: AuditEntidadTipo.KAM,
      entidadId: kamId,
      valorNuevo: JSON.stringify({ rondaId, veredictoEditado: true }),
    });

    return await this.toRondaResponse(saved, await this.loadEncuestas(saved.id));
  }

  async ejecutarRonda(
    kamId: number,
    rondaId: number,
    actorId: number,
    paisSesionId: number,
    rol: Rol,
  ): Promise<KamRondaResponseDto> {
    this.assertPuedeGestionar(rol);
    const ronda = await this.getRondaOrFail(kamId, rondaId, paisSesionId);
    this.assertRondaPendiente(ronda);

    ronda.estado = EstadoKamRonda.Ejecutado;
    ronda.ejecutadoManual = true;
    const saved = await this.rondaRepository.save(ronda);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.KAM_RONDA_EJECUTAR,
      entidadTipo: AuditEntidadTipo.KAM,
      entidadId: kamId,
      valorNuevo: JSON.stringify({ rondaId, manual: true }),
    });

    return await this.toRondaResponse(saved, await this.loadEncuestas(saved.id));
  }

  async agendarReunion(
    kamId: number,
    rondaId: number,
    dto: ReunionRondaDto,
    actorId: number,
    paisSesionId: number,
    rol: Rol,
  ): Promise<KamRondaResponseDto> {
    this.assertPuedeGestionar(rol);
    const ronda = await this.getRondaOrFail(kamId, rondaId, paisSesionId);

    if (ronda.estado !== EstadoKamRonda.Ejecutado) {
      throw new BusinessException(
        ErrorCode.KAM_RONDA_ESTADO_INVALIDO,
        'Solo se puede agendar reunión en rondas ejecutadas',
        HttpStatus.BAD_REQUEST,
      );
    }

    ronda.fechaReunionSocializacion = dto.fechaReunionSocializacion;
    const saved = await this.rondaRepository.save(ronda);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.KAM_RONDA_EDITAR,
      entidadTipo: AuditEntidadTipo.KAM,
      entidadId: kamId,
      valorNuevo: JSON.stringify({
        rondaId,
        fechaReunionSocializacion: dto.fechaReunionSocializacion,
      }),
    });

    return await this.toRondaResponse(saved, await this.loadEncuestas(saved.id));
  }

  async socializarRonda(
    kamId: number,
    rondaId: number,
    actorId: number,
    paisSesionId: number,
    rol: Rol,
  ): Promise<KamRondaResponseDto> {
    this.assertPuedeGestionar(rol);
    const ronda = await this.getRondaOrFail(kamId, rondaId, paisSesionId);

    if (ronda.estado !== EstadoKamRonda.Ejecutado) {
      throw new BusinessException(
        ErrorCode.KAM_RONDA_ESTADO_INVALIDO,
        'Solo se puede socializar una ronda ejecutada',
        HttpStatus.BAD_REQUEST,
      );
    }

    ronda.estado = EstadoKamRonda.Socializado;
    ronda.socializadoPorId = actorId;
    ronda.fechaSocializado = new Date();
    const saved = await this.rondaRepository.save(ronda);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.KAM_RONDA_SOCIALIZAR,
      entidadTipo: AuditEntidadTipo.KAM,
      entidadId: kamId,
      valorNuevo: JSON.stringify({ rondaId }),
    });

    return await this.toRondaResponse(saved, await this.loadEncuestas(saved.id));
  }

  toResponse(kam: Kam): KamResponseDto {
    return {
      id: kam.id,
      procesoId: kam.procesoId,
      paisId: kam.paisId,
      empresaClienteId: kam.empresaClienteId,
      fechaCreacion: kam.fechaCreacion,
      creadoPorId: kam.creadoPorId,
    };
  }

  private async buildDetail(kam: Kam): Promise<KamDetailDto> {
    const proceso = await this.procesoRepository.findOne({
      where: { id: kam.procesoId },
      relations: { empresaCliente: true },
    });

    const contactosProceso = await this.procesoContactoRepository.find({
      where: { procesoId: kam.procesoId },
      relations: { contacto: true },
      order: { fechaAsociacion: 'ASC' },
    });

    const rondas = await this.rondaRepository.find({
      where: { kamId: kam.id },
      order: { numero: 'DESC' },
    });

    const rondasDto: KamRondaResponseDto[] = [];
    for (const ronda of rondas) {
      rondasDto.push(
        await this.toRondaResponse(ronda, await this.loadEncuestas(ronda.id)),
      );
    }

    return {
      ...this.toResponse(kam),
      procesoCodigo: proceso?.codigo ?? null,
      procesoIdDigitado: proceso?.idDigitado ?? '',
      procesoObjeto: proceso?.objeto ?? null,
      empresaMostrar: proceso?.empresaCliente?.empresa ?? '',
      contactosProceso: contactosProceso.map((item) => ({
        contactoId: Number(item.contactoId),
        nombre: item.contacto.nombre,
        cargo: item.contacto.cargo,
        correo: item.contacto.correo,
      })),
      rondas: rondasDto,
    };
  }

  private async loadEncuestas(rondaId: number): Promise<KamEncuestaResponseDto[]> {
    const encuestas = await this.encuestaRepository.find({
      where: { rondaId },
      relations: {
        formato: { secciones: { preguntas: { items: true } } },
        contactos: { contacto: true },
        respuestas: true,
      },
      order: { fechaCreacion: 'ASC' },
    });

    const result: KamEncuestaResponseDto[] = [];

    for (const encuesta of encuestas) {
      const secciones = encuesta.formato.secciones ?? [];
      const items = this.flattenItems(secciones);
      const requiredItems = items.filter((i) => i.requiereCalificacion);
      const observationOnlyItems = items.filter((i) => !i.requiereCalificacion);

      const contactos = encuesta.contactos.map((item) => {
        const respuestas = encuesta.respuestas.filter(
          (resp) => Number(resp.contactoId) === Number(item.contactoId),
        );
        const answeredRequired = requiredItems.every((req) =>
          respuestas.some(
            (resp) =>
              Number(resp.itemId) === Number(req.id) &&
              typeof resp.puntaje === 'number',
          ),
        );
        const answeredObservations = observationOnlyItems.every((req) =>
          respuestas.some(
            (resp) =>
              Number(resp.itemId) === Number(req.id) &&
              Boolean(resp.observacion?.trim()),
          ),
        );
        const completo =
          answeredRequired &&
          answeredObservations &&
          (requiredItems.length > 0 || observationOnlyItems.length > 0);
        const resumen = this.calcularResumenFormato(
          secciones,
          respuestas.map((resp) => ({
            itemId: Number(resp.itemId),
            puntaje: resp.puntaje,
          })),
        );

        return {
          contactoId: Number(item.contactoId),
          nombre: item.contacto.nombre,
          completo,
          resumen,
          respuestas: respuestas.map((resp) => ({
            itemId: Number(resp.itemId),
            preguntaId: Number(resp.itemId),
            puntaje: resp.puntaje,
            observacion: resp.observacion,
          })),
        };
      });

      const resumenPrincipal = contactos[0]?.resumen ?? null;

      result.push({
        id: encuesta.id,
        formatoEncuestaId: encuesta.formatoEncuestaId,
        formatoNombre: encuesta.formato.nombre,
        fechaCreacion: encuesta.fechaCreacion,
        veredicto: encuesta.veredicto,
        veredictoEditado: encuesta.veredictoEditado,
        resumen: resumenPrincipal,
        contactos,
      });
    }

    return result;
  }

  private flattenItems(
    secciones: FormatoEncuesta['secciones'],
  ): FormatoEncuestaItem[] {
    const items: FormatoEncuestaItem[] = [];
    for (const seccion of secciones ?? []) {
      for (const pregunta of seccion.preguntas ?? []) {
        for (const item of pregunta.items ?? []) {
          items.push(item);
        }
      }
    }
    return items;
  }

  private calcularResumenFormato(
    secciones: FormatoEncuesta['secciones'],
    respuestas: Array<{ itemId: number; puntaje: number | null }>,
  ): ResumenEncuesta {
    const seccionesInput = (secciones ?? [])
      .slice()
      .sort((a, b) => a.orden - b.orden)
      .map((seccion) => ({
        id: Number(seccion.id),
        orden: seccion.orden,
        titulo: seccion.titulo,
        items: (seccion.preguntas ?? []).flatMap((pregunta) =>
          (pregunta.items ?? []).map((item) => ({
            id: Number(item.id),
            requiereCalificacion: item.requiereCalificacion,
          })),
        ),
      }));

    return calcularResumenDesdeItems(seccionesInput, respuestas);
  }

  private async maybeRefreshVeredictoRonda(ronda: KamRonda): Promise<void> {
    if (ronda.veredictoEditado) return;

    const encuestas = await this.loadEncuestas(ronda.id);
    const resumenes = encuestas
      .map((e) => e.resumen)
      .filter((r): r is NonNullable<typeof r> => !!r) as ResumenEncuesta[];

    if (!resumenes.length) return;

    const agregado = agregarResumenes(resumenes);
    ronda.veredicto = agregado.veredictoSugerido;
    await this.rondaRepository.save(ronda);
  }

  private async crearPrimeraRonda(kamId: number, actorId: number): Promise<KamRonda> {
    const ronda = await this.rondaRepository.save(
      this.rondaRepository.create({
        kamId,
        numero: 1,
        estado: EstadoKamRonda.Pendiente,
      }),
    );

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.KAM_RONDA_CREAR,
      entidadTipo: AuditEntidadTipo.KAM,
      entidadId: kamId,
      valorNuevo: JSON.stringify({ rondaId: ronda.id, numero: 1, auto: true }),
    });

    return ronda;
  }

  private async asegurarPrimeraRonda(kamId: number, actorId: number): Promise<void> {
    const existente = await this.rondaRepository.findOne({
      where: { kamId },
      order: { numero: 'ASC' },
    });

    if (!existente) {
      await this.crearPrimeraRonda(kamId, actorId);
    }
  }

  private async assertContactosDelProceso(
    procesoId: number,
    contactoIds: number[],
  ): Promise<void> {
    const rows = await this.procesoContactoRepository.find({
      where: { procesoId, contactoId: In(contactoIds) },
    });

    if (rows.length !== contactoIds.length) {
      throw new BusinessException(
        ErrorCode.KAM_CONTACTO_INVALIDO,
        'Uno o más contactos no pertenecen al proceso',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async getKamOrFail(id: number, paisSesionId: number): Promise<Kam> {
    const kam = await this.kamRepository.findOne({ where: { id, paisId: paisSesionId } });

    if (!kam) {
      throw new BusinessException(
        ErrorCode.KAM_NO_ENCONTRADO,
        'KAM no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    return kam;
  }

  private async getRondaOrFail(
    kamId: number,
    rondaId: number,
    paisSesionId: number,
  ): Promise<KamRonda> {
    await this.getKamOrFail(kamId, paisSesionId);

    const ronda = await this.rondaRepository.findOne({
      where: { id: rondaId, kamId },
    });

    if (!ronda) {
      throw new BusinessException(
        ErrorCode.KAM_RONDA_NO_ENCONTRADA,
        'Ronda KAM no encontrada',
        HttpStatus.NOT_FOUND,
      );
    }

    return ronda;
  }

  private assertRondaPendiente(ronda: KamRonda): void {
    if (ronda.estado !== EstadoKamRonda.Pendiente) {
      throw new BusinessException(
        ErrorCode.KAM_RONDA_ESTADO_INVALIDO,
        'La operación solo aplica a rondas en estado Pendiente',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private assertPuedeGestionar(rol: Rol): void {
    if (!this.permisosService.puedeGestionarProcesos(rol)) {
      throw new BusinessException(
        ErrorCode.PERMISO_DENEGADO,
        'No tiene permisos para gestionar KAM',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private toDateOnlyString(value: unknown): string {
    if (!value) return '';

    if (value instanceof Date) {
      const year = value.getUTCFullYear();
      const month = String(value.getUTCMonth() + 1).padStart(2, '0');
      const day = String(value.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    const raw = String(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      return raw.slice(0, 10);
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return this.toDateOnlyString(parsed);
    }

    return raw.slice(0, 10);
  }

  private async toRondaResponse(
    ronda: KamRonda,
    encuestas: KamEncuestaResponseDto[],
  ): Promise<KamRondaResponseDto> {
    const resumenes = encuestas
      .map((e) => e.resumen)
      .filter((r): r is NonNullable<typeof r> => !!r) as ResumenEncuesta[];
    const resumen = resumenes.length ? agregarResumenes(resumenes) : null;

    let archivos = await this.correspondenciaRepository.find({
      where: { rondaId: ronda.id },
      order: { id: 'ASC' },
    });

    if (
      !archivos.length &&
      ronda.correspondenciaRuta &&
      ronda.correspondenciaNombre
    ) {
      archivos = [
        {
          id: 0,
          rondaId: ronda.id,
          nombre: ronda.correspondenciaNombre,
          ruta: ronda.correspondenciaRuta,
          fechaCreacion: ronda.fechaCreacion,
        } as KamRondaCorrespondencia,
      ];
    }

    const correspondencias = archivos.map((item) => ({
      id: Number(item.id),
      nombre: item.nombre,
      url:
        Number(item.id) > 0
          ? `/api/v1/kam/${ronda.kamId}/rondas/${ronda.id}/correspondencia/${item.id}`
          : `/api/v1/kam/${ronda.kamId}/rondas/${ronda.id}/correspondencia`,
    }));

    const bitacoraEntradas = await this.loadBitacoraEntradas(ronda.id);
    const bitacoraLegacy =
      bitacoraEntradas.length > 0
        ? bitacoraEntradas.map((e) => e.texto).join('\n\n')
        : ronda.bitacora;

    return {
      id: ronda.id,
      numero: ronda.numero,
      estado: ronda.estado,
      fechaReunionSocializacion: ronda.fechaReunionSocializacion
        ? this.toDateOnlyString(ronda.fechaReunionSocializacion)
        : null,
      bitacora: bitacoraLegacy,
      bitacoraEntradas,
      veredicto: ronda.veredicto,
      veredictoEditado: ronda.veredictoEditado,
      resumen,
      correspondencias,
      correspondenciaNombre: correspondencias[0]?.nombre ?? null,
      correspondenciaUrl: correspondencias[0]?.url ?? null,
      ejecutadoManual: ronda.ejecutadoManual,
      fechaSocializado: ronda.fechaSocializado,
      encuestas,
    };
  }

  private async loadBitacoraEntradas(
    rondaId: number,
  ): Promise<KamBitacoraEntradaDto[]> {
    const rows = await this.bitacoraRepository.find({
      where: { rondaId },
      relations: { usuario: true },
      order: { fechaCreacion: 'ASC', id: 'ASC' },
    });

    return rows.map((row) => ({
      id: Number(row.id),
      rondaId: Number(row.rondaId),
      usuarioId: Number(row.usuarioId),
      usuarioNombre: row.usuario?.nombre ?? 'Usuario',
      texto: row.texto,
      fechaCreacion: row.fechaCreacion,
    }));
  }

  private async guardarArchivo(
    kamId: number,
    rondaId: number,
    archivo: Express.Multer.File,
  ): Promise<{ nombre: string; rutaRelativa: string }> {
    const safeName = archivo.originalname.replace(/[^\w.\-()\sÀ-ÿ]/g, '_');
    const dirRelativo = path.join('uploads', 'kam', String(kamId), String(rondaId));
    const dirAbsoluto = path.join(process.cwd(), dirRelativo);
    await fs.promises.mkdir(dirAbsoluto, { recursive: true });

    const nombreArchivo = `${Date.now()}-${safeName}`;
    const rutaAbsoluta = path.join(dirAbsoluto, nombreArchivo);
    await fs.promises.writeFile(rutaAbsoluta, archivo.buffer);

    return {
      nombre: archivo.originalname,
      rutaRelativa: path.join(dirRelativo, nombreArchivo).replace(/\\/g, '/'),
    };
  }

  private async eliminarArchivo(rutaRelativa: string): Promise<void> {
    try {
      await fs.promises.unlink(path.join(process.cwd(), rutaRelativa));
    } catch {
      // noop
    }
  }
}
