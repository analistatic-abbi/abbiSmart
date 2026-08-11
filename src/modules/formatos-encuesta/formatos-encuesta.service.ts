import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  AuditAccion,
  AuditEntidadTipo,
} from '../../common/enums/audit-accion.enum';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { normalizeHeaders, readSpreadsheet } from '../../common/utils/spreadsheet-reader';
import { FormatoEncuestaItem } from '../../database/entities/formato-encuesta-item.entity';
import { FormatoEncuestaPregunta } from '../../database/entities/formato-encuesta-pregunta.entity';
import { FormatoEncuestaSeccion } from '../../database/entities/formato-encuesta-seccion.entity';
import { FormatoEncuesta } from '../../database/entities/formato-encuesta.entity';
import { KamEncuesta } from '../../database/entities/kam-encuesta.entity';
import { AuditService } from '../audit/audit.service';
import {
  ClonarFormatoEncuestaDto,
  CreateFormatoEncuestaDto,
  FormatoEncuestaDetailDto,
  FormatoEncuestaListItemDto,
  FormatoEncuestaSeccionInputDto,
  UpdateFormatoEncuestaDto,
  UpdateFormatoEncuestaEstructuraDto,
} from './dto/formato-encuesta.dto';
import { getDefaultSeccionesFormatoEncuesta } from './formato-encuesta-defaults';

@Injectable()
export class FormatosEncuestaService {
  constructor(
    @InjectRepository(FormatoEncuesta)
    private readonly formatoRepository: Repository<FormatoEncuesta>,
    @InjectRepository(FormatoEncuestaSeccion)
    private readonly seccionRepository: Repository<FormatoEncuestaSeccion>,
    @InjectRepository(FormatoEncuestaPregunta)
    private readonly preguntaRepository: Repository<FormatoEncuestaPregunta>,
    @InjectRepository(FormatoEncuestaItem)
    private readonly itemRepository: Repository<FormatoEncuestaItem>,
    @InjectRepository(KamEncuesta)
    private readonly kamEncuestaRepository: Repository<KamEncuesta>,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(
    paisSesionId: number,
    soloActivos = false,
  ): Promise<FormatoEncuestaListItemDto[]> {
    const qb = this.formatoRepository
      .createQueryBuilder('formato')
      .leftJoin('formato.secciones', 'seccion')
      .leftJoin('seccion.preguntas', 'pregunta')
      .leftJoin('pregunta.items', 'item')
      .where('formato.paisId = :paisId', { paisId: paisSesionId })
      .groupBy('formato.id')
      .select('formato.id', 'id')
      .addSelect('formato.nombre', 'nombre')
      .addSelect('formato.activo', 'activo')
      .addSelect('formato.fechaCreacion', 'fechaCreacion')
      .addSelect('COUNT(DISTINCT pregunta.id)', 'cantidadPreguntas')
      .addSelect('COUNT(DISTINCT item.id)', 'cantidadItems')
      .orderBy('formato.fechaCreacion', 'DESC');

    if (soloActivos) {
      qb.andWhere('formato.activo = :activo', { activo: true });
    }

    const rows = await qb.getRawMany<{
      id: string;
      nombre: string;
      activo: number;
      fechaCreacion: Date;
      cantidadPreguntas: string;
      cantidadItems: string;
    }>();

    return rows.map((row) => ({
      id: Number(row.id),
      nombre: row.nombre,
      activo: Boolean(row.activo),
      cantidadPreguntas: Number(row.cantidadPreguntas),
      cantidadItems: Number(row.cantidadItems),
      fechaCreacion: row.fechaCreacion.toISOString(),
    }));
  }

  async findById(id: number, paisSesionId: number): Promise<FormatoEncuestaDetailDto> {
    const formato = await this.getFormatoOrFail(id, paisSesionId, true);
    return this.toDetailDto(formato, await this.estaEnUso(formato.id));
  }

  async create(
    dto: CreateFormatoEncuestaDto,
    actorId: number,
    paisSesionId: number,
  ): Promise<FormatoEncuestaDetailDto> {
    await this.assertNombreUnico(paisSesionId, dto.nombre);
    const secciones = this.resolveSeccionesInput(dto);

    return this.dataSource.transaction(async (manager) => {
      const formato = manager.create(FormatoEncuesta, {
        paisId: paisSesionId,
        nombre: dto.nombre.trim(),
        activo: true,
      });
      const saved = await manager.save(formato);
      await this.saveEstructura(manager, saved.id, secciones);

      await this.auditService.log({
        usuarioId: actorId,
        accion: AuditAccion.FORMATO_ENCUESTA_CREAR,
        entidadTipo: AuditEntidadTipo.FORMATO_ENCUESTA,
        entidadId: saved.id,
        valorNuevo: JSON.stringify({ nombre: saved.nombre }),
      });

      const completo = await this.loadFormatoTree(manager, saved.id);
      return this.toDetailDto(completo!, false);
    });
  }

  async importFromSpreadsheet(
    nombre: string,
    fileName: string,
    buffer: Buffer,
    actorId: number,
    paisSesionId: number,
  ): Promise<FormatoEncuestaDetailDto> {
    const secciones = await this.parseSeccionesFromSpreadsheet(fileName, buffer);
    return this.create({ nombre, secciones }, actorId, paisSesionId);
  }

  async clonar(
    id: number,
    dto: ClonarFormatoEncuestaDto,
    actorId: number,
    paisSesionId: number,
  ): Promise<FormatoEncuestaDetailDto> {
    const origen = await this.getFormatoOrFail(id, paisSesionId, true);
    await this.assertNombreUnico(paisSesionId, dto.nombre);

    const secciones =
      dto.secciones ?? this.estructuraFromEntity(origen);

    return this.dataSource.transaction(async (manager) => {
      const formato = manager.create(FormatoEncuesta, {
        paisId: paisSesionId,
        nombre: dto.nombre.trim(),
        activo: true,
        clonadoDeId: origen.id,
      });
      const saved = await manager.save(formato);
      await this.saveEstructura(manager, saved.id, secciones);

      await this.auditService.log({
        usuarioId: actorId,
        accion: AuditAccion.FORMATO_ENCUESTA_CLONAR,
        entidadTipo: AuditEntidadTipo.FORMATO_ENCUESTA,
        entidadId: saved.id,
        valorNuevo: JSON.stringify({ origenId: origen.id, nombre: saved.nombre }),
      });

      const completo = await this.loadFormatoTree(manager, saved.id);
      return this.toDetailDto(completo!, false);
    });
  }

  async update(
    id: number,
    dto: UpdateFormatoEncuestaDto,
    actorId: number,
    paisSesionId: number,
  ): Promise<FormatoEncuestaDetailDto> {
    const formato = await this.getFormatoOrFail(id, paisSesionId, true);

    if (dto.nombre && dto.nombre.trim() !== formato.nombre) {
      await this.assertNombreUnico(paisSesionId, dto.nombre, id);
      formato.nombre = dto.nombre.trim();
    }

    if (dto.activo !== undefined) {
      formato.activo = dto.activo;
    }

    await this.formatoRepository.save(formato);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.FORMATO_ENCUESTA_EDITAR,
      entidadTipo: AuditEntidadTipo.FORMATO_ENCUESTA,
      entidadId: formato.id,
      valorNuevo: JSON.stringify(dto),
    });

    return this.toDetailDto(formato, await this.estaEnUso(formato.id));
  }

  async updateEstructura(
    id: number,
    dto: UpdateFormatoEncuestaEstructuraDto,
    actorId: number,
    paisSesionId: number,
  ): Promise<FormatoEncuestaDetailDto> {
    const formato = await this.getFormatoOrFail(id, paisSesionId, true);

    if (await this.estaEnUso(formato.id)) {
      throw new BusinessException(
        ErrorCode.FORMATO_ENCUESTA_EN_USO,
        'El formato ya está en uso. Debe clonarlo para editar la estructura.',
        HttpStatus.CONFLICT,
      );
    }

    this.assertEstructuraValida(dto.secciones);

    return this.dataSource.transaction(async (manager) => {
      await manager.delete(FormatoEncuestaSeccion, { formatoEncuestaId: formato.id });
      await this.saveEstructura(manager, formato.id, dto.secciones);

      const completo = await this.loadFormatoTree(manager, formato.id);

      await this.auditService.log({
        usuarioId: actorId,
        accion: AuditAccion.FORMATO_ENCUESTA_EDITAR,
        entidadTipo: AuditEntidadTipo.FORMATO_ENCUESTA,
        entidadId: formato.id,
        valorNuevo: JSON.stringify({ secciones: dto.secciones.length }),
      });

      return this.toDetailDto(completo!, false);
    });
  }

  /** @deprecated alias para updateEstructura con payload plano legacy */
  async updatePreguntas(
    id: number,
    dto: { preguntas: Array<{ orden: number; texto: string }> },
    actorId: number,
    paisSesionId: number,
  ): Promise<FormatoEncuestaDetailDto> {
    const secciones = this.flatPreguntasToSecciones(dto.preguntas);
    return this.updateEstructura(id, { secciones }, actorId, paisSesionId);
  }

  private resolveSeccionesInput(dto: CreateFormatoEncuestaDto): FormatoEncuestaSeccionInputDto[] {
    if (dto.secciones?.length) {
      this.assertEstructuraValida(dto.secciones);
      return dto.secciones;
    }
    if (dto.preguntas?.length) {
      return this.flatPreguntasToSecciones(dto.preguntas);
    }
    return getDefaultSeccionesFormatoEncuesta();
  }

  private flatPreguntasToSecciones(
    preguntas: Array<{ orden: number; texto: string }>,
  ): FormatoEncuestaSeccionInputDto[] {
    return [
      {
        orden: 1,
        titulo: 'Sección 1',
        preguntas: preguntas.map((p, index) => ({
          orden: p.orden || index + 1,
          texto: p.texto,
          items: [{ orden: 1, subseccion: null, requiereCalificacion: true }],
        })),
      },
    ];
  }

  private assertEstructuraValida(secciones: FormatoEncuestaSeccionInputDto[]): void {
    if (!secciones.length) {
      throw new BusinessException(
        ErrorCode.FORMATO_ENCUESTA_PREGUNTAS_INVALIDAS,
        'El formato debe tener al menos una sección',
        HttpStatus.BAD_REQUEST,
      );
    }
    for (const seccion of secciones) {
      if (!seccion.preguntas?.length) {
        throw new BusinessException(
          ErrorCode.FORMATO_ENCUESTA_PREGUNTAS_INVALIDAS,
          `La sección "${seccion.titulo}" debe tener al menos una pregunta`,
          HttpStatus.BAD_REQUEST,
        );
      }
      for (const pregunta of seccion.preguntas) {
        if (!pregunta.items?.length) {
          throw new BusinessException(
            ErrorCode.FORMATO_ENCUESTA_PREGUNTAS_INVALIDAS,
            `La pregunta "${pregunta.texto}" debe tener al menos un ítem respondible`,
            HttpStatus.BAD_REQUEST,
          );
        }
      }
    }
  }

  private async parseSeccionesFromSpreadsheet(
    fileName: string,
    buffer: Buffer,
  ): Promise<FormatoEncuestaSeccionInputDto[]> {
    const rows = await readSpreadsheet(buffer, fileName);
    if (!rows.length) {
      throw new BusinessException(
        ErrorCode.FORMATO_ENCUESTA_PREGUNTAS_INVALIDAS,
        'El archivo no contiene filas válidas',
        HttpStatus.BAD_REQUEST,
      );
    }

    const header = normalizeHeaders(rows[0].map(String));
    const hasStructuredHeader =
      header.includes('seccion') &&
      header.includes('pregunta') &&
      header.includes('requiere_calificacion');

    if (hasStructuredHeader) {
      return this.parseStructuredRows(rows);
    }

    // Legacy: primera columna = pregunta
    const preguntas: FormatoEncuestaSeccionInputDto['preguntas'] = [];
    rows.forEach((row, index) => {
      const texto = String(row[0] ?? '').trim();
      if (!texto || ['pregunta', 'texto', 'orden'].includes(texto.toLowerCase())) {
        return;
      }
      preguntas.push({
        orden: preguntas.length + 1,
        texto,
        items: [{ orden: 1, subseccion: null, requiereCalificacion: true }],
      });
    });

    if (!preguntas.length) {
      throw new BusinessException(
        ErrorCode.FORMATO_ENCUESTA_PREGUNTAS_INVALIDAS,
        'El archivo no contiene preguntas válidas. Use columnas seccion,pregunta,subseccion,requiere_calificacion o una columna A con preguntas.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return [{ orden: 1, titulo: 'Sección 1', preguntas }];
  }

  private parseStructuredRows(rows: string[][]): FormatoEncuestaSeccionInputDto[] {
    const header = normalizeHeaders(rows[0].map(String));
    const idxSeccion = header.indexOf('seccion');
    const idxPregunta = header.indexOf('pregunta');
    const idxSub = header.indexOf('subseccion');
    const idxReq = header.indexOf('requiere_calificacion');

    const seccionesMap = new Map<
      string,
      {
        orden: number;
        titulo: string;
        preguntasMap: Map<
          string,
          {
            orden: number;
            texto: string;
            items: FormatoEncuestaSeccionInputDto['preguntas'][0]['items'];
          }
        >;
      }
    >();

    let seccionOrden = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const seccionTitulo = String(row[idxSeccion] ?? '').trim();
      const preguntaTexto = String(row[idxPregunta] ?? '').trim();
      const subseccionRaw = idxSub >= 0 ? String(row[idxSub] ?? '').trim() : '';
      const requiereRaw = String(row[idxReq] ?? '').trim();

      if (!seccionTitulo || !preguntaTexto) continue;

      if (!seccionesMap.has(seccionTitulo)) {
        seccionOrden += 1;
        seccionesMap.set(seccionTitulo, {
          orden: seccionOrden,
          titulo: seccionTitulo,
          preguntasMap: new Map(),
        });
      }

      const seccion = seccionesMap.get(seccionTitulo)!;
      if (!seccion.preguntasMap.has(preguntaTexto)) {
        seccion.preguntasMap.set(preguntaTexto, {
          orden: seccion.preguntasMap.size + 1,
          texto: preguntaTexto,
          items: [],
        });
      }

      const pregunta = seccion.preguntasMap.get(preguntaTexto)!;
      pregunta.items.push({
        orden: pregunta.items.length + 1,
        subseccion: subseccionRaw || null,
        requiereCalificacion: this.parseRequiereCalificacion(requiereRaw),
      });
    }

    const secciones: FormatoEncuestaSeccionInputDto[] = [...seccionesMap.values()].map(
      (seccion) => ({
        orden: seccion.orden,
        titulo: seccion.titulo,
        preguntas: [...seccion.preguntasMap.values()].map((p) => ({
          orden: p.orden,
          texto: p.texto,
          items: p.items,
        })),
      }),
    );

    this.assertEstructuraValida(secciones);
    return secciones;
  }

  private parseRequiereCalificacion(value: string): boolean {
    const v = value.toLowerCase().trim();
    if (['no', 'n', '0', 'false', 'f'].includes(v)) return false;
    if (['si', 'sí', 'yes', 'y', '1', 'true', 't'].includes(v)) return true;
    return true;
  }

  private async saveEstructura(
    manager: DataSource['manager'],
    formatoId: number,
    secciones: FormatoEncuestaSeccionInputDto[],
  ): Promise<void> {
    for (const seccionInput of secciones) {
      const seccion = await manager.save(
        manager.create(FormatoEncuestaSeccion, {
          formatoEncuestaId: formatoId,
          orden: seccionInput.orden,
          titulo: seccionInput.titulo.trim(),
        }),
      );

      for (const preguntaInput of seccionInput.preguntas) {
        const pregunta = await manager.save(
          manager.create(FormatoEncuestaPregunta, {
            seccionId: seccion.id,
            orden: preguntaInput.orden,
            texto: preguntaInput.texto.trim(),
          }),
        );

        for (const itemInput of preguntaInput.items) {
          await manager.save(
            manager.create(FormatoEncuestaItem, {
              preguntaId: pregunta.id,
              orden: itemInput.orden,
              subseccion: itemInput.subseccion?.trim() || null,
              requiereCalificacion: itemInput.requiereCalificacion,
            }),
          );
        }
      }
    }
  }

  private estructuraFromEntity(formato: FormatoEncuesta): FormatoEncuestaSeccionInputDto[] {
    return (formato.secciones ?? [])
      .slice()
      .sort((a, b) => a.orden - b.orden)
      .map((seccion) => ({
        orden: seccion.orden,
        titulo: seccion.titulo,
        preguntas: (seccion.preguntas ?? [])
          .slice()
          .sort((a, b) => a.orden - b.orden)
          .map((pregunta) => ({
            orden: pregunta.orden,
            texto: pregunta.texto,
            items: (pregunta.items ?? [])
              .slice()
              .sort((a, b) => a.orden - b.orden)
              .map((item) => ({
                orden: item.orden,
                subseccion: item.subseccion,
                requiereCalificacion: item.requiereCalificacion,
              })),
          })),
      }));
  }

  private async loadFormatoTree(
    manager: DataSource['manager'],
    formatoId: number,
  ): Promise<FormatoEncuesta | null> {
    return manager.findOne(FormatoEncuesta, {
      where: { id: formatoId },
      relations: {
        secciones: {
          preguntas: {
            items: true,
          },
        },
      },
      order: {
        secciones: {
          orden: 'ASC',
          preguntas: {
            orden: 'ASC',
            items: { orden: 'ASC' },
          },
        },
      },
    });
  }

  private async getFormatoOrFail(
    id: number,
    paisSesionId: number,
    withTree = false,
  ): Promise<FormatoEncuesta> {
    const formato = await this.formatoRepository.findOne({
      where: { id, paisId: paisSesionId },
      relations: withTree
        ? {
            secciones: {
              preguntas: {
                items: true,
              },
            },
          }
        : undefined,
      order: withTree
        ? {
            secciones: {
              orden: 'ASC',
              preguntas: {
                orden: 'ASC',
                items: { orden: 'ASC' },
              },
            },
          }
        : undefined,
    });

    if (!formato) {
      throw new BusinessException(
        ErrorCode.FORMATO_ENCUESTA_NO_ENCONTRADO,
        'Formato de encuesta no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    if (withTree && formato.secciones) {
      formato.secciones.sort((a, b) => a.orden - b.orden);
      for (const seccion of formato.secciones) {
        seccion.preguntas?.sort((a, b) => a.orden - b.orden);
        for (const pregunta of seccion.preguntas ?? []) {
          pregunta.items?.sort((a, b) => a.orden - b.orden);
        }
      }
    }

    return formato;
  }

  private async assertNombreUnico(
    paisId: number,
    nombre: string,
    excludeId?: number,
  ): Promise<void> {
    const existente = await this.formatoRepository.findOne({
      where: { paisId, nombre: nombre.trim() },
    });

    if (existente && existente.id !== excludeId) {
      throw new BusinessException(
        ErrorCode.FORMATO_ENCUESTA_DUPLICADO,
        `Ya existe un formato de encuesta con el nombre "${nombre.trim()}"`,
        HttpStatus.CONFLICT,
      );
    }
  }

  private async estaEnUso(formatoId: number): Promise<boolean> {
    return this.kamEncuestaRepository.exists({ where: { formatoEncuestaId: formatoId } });
  }

  private toDetailDto(formato: FormatoEncuesta, enUso: boolean): FormatoEncuestaDetailDto {
    const secciones = (formato.secciones ?? [])
      .slice()
      .sort((a, b) => a.orden - b.orden)
      .map((seccion) => ({
        id: Number(seccion.id),
        orden: seccion.orden,
        titulo: seccion.titulo,
        preguntas: (seccion.preguntas ?? [])
          .slice()
          .sort((a, b) => a.orden - b.orden)
          .map((pregunta) => ({
            id: Number(pregunta.id),
            orden: pregunta.orden,
            texto: pregunta.texto,
            items: (pregunta.items ?? [])
              .slice()
              .sort((a, b) => a.orden - b.orden)
              .map((item) => ({
                id: Number(item.id),
                orden: item.orden,
                subseccion: item.subseccion,
                requiereCalificacion: item.requiereCalificacion,
              })),
          })),
      }));

    let flatOrden = 0;
    const preguntasFlat = secciones.flatMap((seccion) =>
      seccion.preguntas.map((pregunta) => {
        flatOrden += 1;
        return {
          id: pregunta.id,
          orden: flatOrden,
          texto: pregunta.texto,
        };
      }),
    );

    return {
      id: Number(formato.id),
      nombre: formato.nombre,
      activo: formato.activo,
      clonadoDeId: formato.clonadoDeId,
      fechaCreacion: formato.fechaCreacion.toISOString(),
      secciones,
      preguntas: preguntasFlat,
      enUso,
    };
  }
}
