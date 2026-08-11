import { HttpStatus, Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuditAccion,
  AuditEntidadTipo,
} from '../../common/enums/audit-accion.enum';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { UbicacionGeografica } from '../../database/entities/ubicacion-geografica.entity';
import { Pais } from '../../database/entities/pais.entity';
import {
  CargaMasivaDetalleCreado,
  CargaMasivaLog,
} from '../../database/entities/carga-masiva-log.entity';
import { Rol } from '../../common/enums/rol.enum';
import { EliminacionDependenciasService } from '../../common/services/eliminacion-dependencias.service';
import { AuditService } from '../audit/audit.service';
import { ContactosService } from '../contactos/contactos.service';
import { ProyeccionesService } from '../proyecciones/proyecciones.service';
import { CreateClienteDto } from '../clientes/dto/create-cliente.dto';
import { CreateContactoDto } from '../contactos/dto/create-contacto.dto';
import { CreateProyeccionDto } from '../proyecciones/dto/proyeccion.dto';
import { MercadoProyeccion } from '../../common/enums/mercado-proyeccion.enum';
import { readSpreadsheet } from '../../common/utils/spreadsheet-reader';
import {
  CargaMasivaFilaError,
  formatUbicacionCargaMasivaError,
  sugerenciaPorCodigoError,
} from '../../common/utils/carga-masiva-error.util';
import {
  bogotaMunicipioAliases,
  normalizeColombiaUbicacionInput,
} from '../../common/utils/ubicacion-colombia.util';
import { ClientesService } from '../clientes/clientes.service';

export interface CargaMasivaResult {
  filasExitosas: number;
  filasRechazadas: number;
  detalleErrores: CargaMasivaFilaError[];
  detalleCreados: CargaMasivaDetalleCreado[];
  logId: number;
}

export interface CargaMasivaRevertResult {
  eliminados: number;
  omitidos: number;
  detalleOmitidos: Array<{
    entidadId: number;
    etiqueta: string;
    motivo: string;
  }>;
}

@Injectable()
export class CargaMasivaService {
  constructor(
    @InjectRepository(CargaMasivaLog)
    private readonly cargaLogRepository: Repository<CargaMasivaLog>,
    @InjectRepository(UbicacionGeografica)
    private readonly ubicacionRepository: Repository<UbicacionGeografica>,
    @InjectRepository(Pais)
    private readonly paisRepository: Repository<Pais>,
    private readonly clientesService: ClientesService,
    private readonly contactosService: ContactosService,
    private readonly proyeccionesService: ProyeccionesService,
    private readonly auditService: AuditService,
    private readonly eliminacionDependenciasService: EliminacionDependenciasService,
  ) {}

  async findLogs(usuarioId?: number): Promise<CargaMasivaLog[]> {
    const where = usuarioId ? { usuarioId } : {};

    return this.cargaLogRepository.find({
      where,
      order: { fechaCarga: 'DESC' },
      take: 50,
    });
  }

  async revertirCarga(
    logId: number,
    actorId: number,
    paisSesionId: number,
    rol: Rol,
    confirmarDependientes = false,
  ): Promise<CargaMasivaRevertResult> {
    if (rol !== Rol.ADMINISTRADOR) {
      throw new BusinessException(
        ErrorCode.PERMISO_DENEGADO,
        'Solo el Administrador puede revertir una carga masiva',
        HttpStatus.FORBIDDEN,
      );
    }

    const log = await this.getLogOrFail(logId, actorId);
    this.assertLogPuedeRevertirse(log);

    const pendientes: CargaMasivaDetalleCreado[] = [];
    const detalleOmitidos: CargaMasivaRevertResult['detalleOmitidos'] = [];

    for (const item of log.detalleCreados ?? []) {
      const evaluacion = await this.evaluarRegistroParaRevertir(
        log.entidadTipo,
        item,
        paisSesionId,
        confirmarDependientes,
      );

      if (evaluacion === 'eliminable') {
        pendientes.push(item);
        continue;
      }

      if (evaluacion.omitido) {
        detalleOmitidos.push({
          entidadId: item.entidadId,
          etiqueta: item.etiqueta,
          motivo: evaluacion.motivo,
        });
      }
    }

    let eliminados = 0;

    for (const item of pendientes) {
      await this.eliminarRegistroCarga(
        log.entidadTipo,
        item.entidadId,
        actorId,
        paisSesionId,
        rol,
        confirmarDependientes,
      );
      eliminados += 1;
    }

    if (eliminados === 0) {
      throw new BusinessException(
        ErrorCode.CARGA_MASIVA_SIN_REGISTROS,
        detalleOmitidos.length
          ? 'Los registros de esta carga ya no están disponibles para revertir'
          : 'No hay registros activos para revertir en esta carga',
        HttpStatus.BAD_REQUEST,
        { detalleOmitidos },
      );
    }

    log.revertida = true;
    log.fechaReversion = new Date();
    log.revertidaPorId = actorId;
    await this.cargaLogRepository.save(log);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.CARGA_MASIVA_REVERTIR,
      entidadTipo: AuditEntidadTipo.CARGA_MASIVA,
      entidadId: log.id,
      valorNuevo: JSON.stringify({
        eliminados,
        omitidos: detalleOmitidos.length,
        entidadTipo: log.entidadTipo,
      }),
    });

    return {
      eliminados,
      omitidos: detalleOmitidos.length,
      detalleOmitidos,
    };
  }

  private async evaluarRegistroParaRevertir(
    entidadTipo: string,
    item: CargaMasivaDetalleCreado,
    paisSesionId: number,
    confirmarDependientes: boolean,
  ): Promise<
    | 'eliminable'
    | { omitido: true; motivo: string }
  > {
    try {
      switch (entidadTipo) {
        case 'cliente': {
          const dependencias = await this.clientesService.getDependencias(
            item.entidadId,
            paisSesionId,
          );
          this.eliminacionDependenciasService.assertPuedeEliminar(
            dependencias,
            confirmarDependientes,
            true,
          );
          return 'eliminable';
        }
        case 'contacto':
          await this.contactosService.getContactoActivoOrFail(
            item.entidadId,
            paisSesionId,
          );
          return 'eliminable';
        case 'proyeccion': {
          const dependencias = await this.proyeccionesService.getDependencias(
            item.entidadId,
            paisSesionId,
          );
          this.eliminacionDependenciasService.assertPuedeEliminar(
            dependencias,
            confirmarDependientes,
            true,
          );
          return 'eliminable';
        }
        default:
          return {
            omitido: true,
            motivo: `Tipo de entidad no soportado: ${entidadTipo}`,
          };
      }
    } catch (error) {
      if (error instanceof BusinessException) {
        const response = error.getResponse();
        const errorCode =
          typeof response === 'object' &&
          response !== null &&
          'errorCode' in response
            ? String(response.errorCode)
            : '';

        if (errorCode === ErrorCode.ELIMINACION_CON_DEPENDENCIAS) {
          throw error;
        }

        if (
          errorCode === ErrorCode.CLIENTE_NO_ENCONTRADO ||
          errorCode === ErrorCode.CONTACTO_NO_ENCONTRADO ||
          errorCode === ErrorCode.PROYECCION_NO_ENCONTRADA
        ) {
          return {
            omitido: true,
            motivo: 'El registro ya fue eliminado previamente',
          };
        }

        if (error.getStatus() === HttpStatus.NOT_FOUND) {
          return {
            omitido: true,
            motivo: 'El registro ya fue eliminado previamente',
          };
        }
      }

      throw error;
    }
  }

  private async getLogOrFail(
    logId: number,
    actorId: number,
  ): Promise<CargaMasivaLog> {
    const log = await this.cargaLogRepository.findOne({
      where: { id: logId, usuarioId: actorId },
    });

    if (!log) {
      throw new BusinessException(
        ErrorCode.CARGA_MASIVA_LOG_NO_ENCONTRADO,
        'No se encontró el registro de carga masiva',
        HttpStatus.NOT_FOUND,
      );
    }

    return log;
  }

  private assertLogPuedeRevertirse(log: CargaMasivaLog): void {
    if (log.revertida) {
      throw new BusinessException(
        ErrorCode.CARGA_MASIVA_YA_REVERTIDA,
        'Esta carga masiva ya fue revertida',
        HttpStatus.CONFLICT,
      );
    }

    if (!log.detalleCreados?.length) {
      throw new BusinessException(
        ErrorCode.CARGA_MASIVA_SIN_REGISTROS,
        'Esta carga no tiene registros creados que se puedan revertir',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async eliminarRegistroCarga(
    entidadTipo: string,
    entidadId: number,
    actorId: number,
    paisSesionId: number,
    rol: Rol,
    confirmarDependientes: boolean,
  ): Promise<void> {
    switch (entidadTipo) {
      case 'cliente':
        await this.clientesService.softDelete(
          entidadId,
          actorId,
          paisSesionId,
          rol,
          confirmarDependientes,
        );
        return;
      case 'contacto':
        await this.contactosService.softDelete(
          entidadId,
          actorId,
          paisSesionId,
          rol,
        );
        return;
      case 'proyeccion':
        await this.proyeccionesService.softDelete(
          entidadId,
          actorId,
          paisSesionId,
          rol,
          confirmarDependientes,
        );
        return;
      default:
        throw new BusinessException(
          ErrorCode.VALIDATION_ERROR,
          `Tipo de entidad no soportado para reversión: ${entidadTipo}`,
          HttpStatus.BAD_REQUEST,
        );
    }
  }

  async importClientes(
    fileName: string,
    buffer: Buffer,
    actorId: number,
    paisSesionId: number,
  ): Promise<CargaMasivaResult> {
    const rows = await readSpreadsheet(buffer, fileName);
    const headers = this.normalizeHeaderMap(rows[0]);
    this.assertRequiredHeaders(headers, ['empresa', 'segmento']);

    const detalleErrores: CargaMasivaFilaError[] = [];
    const detalleCreados: CargaMasivaDetalleCreado[] = [];
    let filasExitosas = 0;

    for (let index = 1; index < rows.length; index++) {
      const row = rows[index];
      const fila = index + 1;

      if (row.every((cell) => !cell.trim())) {
        continue;
      }

      try {
        await this.assertPaisRowMatchesSesion(headers, row, paisSesionId);

        const empresa = this.getCell(headers, row, 'empresa');
        const ubicacionId = await this.resolveUbicacionId(
          paisSesionId,
          this.getCell(headers, row, 'departamento', 'region', 'región'),
          this.getCell(
            headers,
            row,
            'municipio',
            'municipio_provincia',
            'ciudad',
          ),
        );

        const dto: CreateClienteDto = {
          empresa,
          ubicacionId,
          segmento: this.getCell(headers, row, 'segmento'),
          segmentoOtro:
            this.getCell(headers, row, 'segmento_otro') || undefined,
        };

        const created = await this.clientesService.create(dto, actorId, paisSesionId);
        detalleCreados.push({
          fila,
          entidadId: created.id,
          etiqueta: created.empresa,
        });
        filasExitosas += 1;
      } catch (error) {
        detalleErrores.push(this.buildRowError(fila, error));
      }
    }

    return this.persistLog(
      'cliente',
      fileName,
      actorId,
      detalleCreados,
      detalleErrores,
    );
  }

  async importContactos(
    fileName: string,
    buffer: Buffer,
    actorId: number,
    paisSesionId: number,
  ): Promise<CargaMasivaResult> {
    const rows = await readSpreadsheet(buffer, fileName);
    const headers = this.normalizeHeaderMap(rows[0]);
    this.assertRequiredHeaders(headers, ['empresa', 'nombre']);

    const detalleErrores: CargaMasivaFilaError[] = [];
    const detalleCreados: CargaMasivaDetalleCreado[] = [];
    let filasExitosas = 0;

    for (let index = 1; index < rows.length; index++) {
      const row = rows[index];
      const fila = index + 1;

      if (row.every((cell) => !cell.trim())) {
        continue;
      }

      try {
        const empresaNombre = this.getCell(headers, row, 'empresa');
        const clienteId = await this.clientesService.findClienteIdByEmpresa(
          empresaNombre,
          paisSesionId,
        );

        await this.assertPaisRowMatchesSesion(headers, row, paisSesionId);

        const ubicacionId = await this.resolveUbicacionId(
          paisSesionId,
          this.getCell(headers, row, 'departamento', 'region', 'región'),
          this.getCell(
            headers,
            row,
            'municipio',
            'municipio_provincia',
            'ciudad',
          ),
        );

        const referidoPorContactoId = await this.resolveReferidoPorContactoId(
          headers,
          row,
          clienteId,
          paisSesionId,
        );

        const dto: CreateContactoDto = {
          nombre: this.getCell(headers, row, 'nombre'),
          ubicacionId,
          cargo: this.getCell(headers, row, 'cargo') || undefined,
          telefono: this.getCell(headers, row, 'telefono') || undefined,
          correo: this.getCell(headers, row, 'correo') || undefined,
          referidoPorContactoId,
        };

        const created = await this.contactosService.create(
          clienteId,
          dto,
          actorId,
          paisSesionId,
        );
        detalleCreados.push({
          fila,
          entidadId: created.id,
          etiqueta: `${created.nombre} (${empresaNombre})`,
          clienteId,
        });
        filasExitosas += 1;
      } catch (error) {
        detalleErrores.push(this.buildRowError(fila, error));
      }
    }

    return this.persistLog(
      'contacto',
      fileName,
      actorId,
      detalleCreados,
      detalleErrores,
    );
  }

  async importProyecciones(
    fileName: string,
    buffer: Buffer,
    actorId: number,
    paisSesionId: number,
  ): Promise<CargaMasivaResult> {
    const rows = await readSpreadsheet(buffer, fileName);
    const headers = this.normalizeHeaderMap(rows[0]);

    if (
      !this.hasHeader(headers, 'segmento', 'segmento_proceso', 'segmento_proyeccion') &&
      this.hasHeader(
        headers,
        'proceso_codigo',
        'proceso_origen_id',
        'codigo_proceso',
        'id_digitado',
        'proceso_origen',
      )
    ) {
      throw new BusinessException(
        ErrorCode.CARGA_MASIVA_FORMATO_INVALIDO,
        'La plantilla está desactualizada: agregue la columna segmento y use empresa o empresa_otro. La carga masiva solo admite proyecciones manuales (sin proceso_codigo).',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.assertRequiredHeaders(headers, [
      { name: 'anio_proyectado', aliases: ['anio', 'ano_proyectado'] },
      {
        name: 'fecha_estimada_publicacion',
        aliases: ['fecha_publicacion', 'fecha_estimada'],
      },
      { name: 'valor_venta', aliases: ['valor_estimado_venta'] },
      { name: 'valor_facturacion', aliases: ['valor_estimado_facturacion'] },
      { name: 'segmento', aliases: ['segmento_proceso', 'segmento_proyeccion'] },
    ]);

    const detalleErrores: CargaMasivaFilaError[] = [];
    const detalleCreados: CargaMasivaDetalleCreado[] = [];
    let filasExitosas = 0;

    for (let index = 1; index < rows.length; index++) {
      const row = rows[index];
      const fila = index + 1;

      if (row.every((cell) => !cell.trim())) {
        continue;
      }

      try {
        const procesoRef = this.getCell(
          headers,
          row,
          'proceso_origen_id',
          'proceso_codigo',
          'codigo_proceso',
          'codigo',
          'id_digitado',
          'proceso_origen',
        );

        if (procesoRef) {
          throw new BusinessException(
            ErrorCode.VALIDATION_ERROR,
            'La carga masiva de proyecciones es solo para proyecciones manuales; las vinculadas a un proceso se generan desde el proceso',
            HttpStatus.BAD_REQUEST,
          );
        }

        const { empresaClienteId, empresaOtro } =
          await this.resolveEmpresaProyeccion(headers, row, paisSesionId);

        const dto: CreateProyeccionDto = {
          anioProyectado: Number.parseInt(
            this.getCell(headers, row, 'anio_proyectado', 'año_proyectado'),
            10,
          ),
          fechaEstimadaPublicacion: this.getCell(
            headers,
            row,
            'fecha_estimada_publicacion',
          ),
          valorVenta: Number.parseFloat(
            this.getCell(
              headers,
              row,
              'valor_venta',
              'valor_estimado_venta',
            ),
          ),
          valorFacturacion: Number.parseFloat(
            this.getCell(
              headers,
              row,
              'valor_facturacion',
              'valor_estimado_facturacion',
            ),
          ),
          empresaClienteId,
          empresaOtro,
          segmento: this.getCell(
            headers,
            row,
            'segmento',
            'segmento_proceso',
            'segmento_proyeccion',
          ),
          objeto: this.getCell(headers, row, 'objeto') || undefined,
        };

        const created = await this.proyeccionesService.create(
          dto,
          actorId,
          paisSesionId,
        );

        const mercado = this.getCell(headers, row, 'mercado');
        if (mercado) {
          await this.proyeccionesService.setMercadoEnCargaMasiva(
            created.id,
            mercado as MercadoProyeccion,
          );
        }

        const etiqueta =
          created.empresa ??
          created.empresaOtro ??
          `Proyección ${created.anioProyectado}`;

        detalleCreados.push({
          fila,
          entidadId: created.id,
          etiqueta: `${etiqueta} (${created.anioProyectado})`,
        });
        filasExitosas += 1;
      } catch (error) {
        detalleErrores.push(this.buildRowError(fila, error));
      }
    }

    return this.persistLog(
      'proyeccion',
      fileName,
      actorId,
      detalleCreados,
      detalleErrores,
    );
  }

  private async assertPaisRowMatchesSesion(
    headers: Map<string, number>,
    row: string[],
    paisSesionId: number,
  ): Promise<void> {
    const paisNombre = this.getCell(headers, row, 'pais', 'país');
    if (!paisNombre) {
      return;
    }

    const pais = await this.paisRepository.findOne({
      where: { nombre: paisNombre, activo: true },
    });

    if (!pais) {
      throw new BusinessException(
        ErrorCode.PAIS_NO_ENCONTRADO,
        `País no reconocido: ${paisNombre}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (Number(pais.id) !== Number(paisSesionId)) {
      throw new BusinessException(
        ErrorCode.PAIS_SESION_INVALIDO,
        'El país del archivo no coincide con el país de la sesión activa',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async resolveEmpresaProyeccion(
    headers: Map<string, number>,
    row: string[],
    paisSesionId: number,
  ): Promise<{ empresaClienteId?: number; empresaOtro?: string }> {
    const empresa = this.getCell(headers, row, 'empresa', 'empresa_cliente');
    const empresaOtro = this.getCell(headers, row, 'empresa_otro', 'empresa_otra');

    if (empresa && empresaOtro) {
      throw new BusinessException(
        ErrorCode.PROCESO_EMPRESA_INVALIDA,
        'Indique empresa (cliente registrado) o empresa_otro, pero no ambos',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (empresa) {
      const empresaClienteId = await this.clientesService.findClienteIdByEmpresa(
        empresa,
        paisSesionId,
      );
      return { empresaClienteId };
    }

    if (empresaOtro) {
      return { empresaOtro };
    }

    throw new BusinessException(
      ErrorCode.PROCESO_EMPRESA_INVALIDA,
      'Debe indicar empresa (cliente registrado) o empresa_otro',
      HttpStatus.BAD_REQUEST,
    );
  }

  private async resolveReferidoPorContactoId(
    headers: Map<string, number>,
    row: string[],
    clienteId: number,
    paisSesionId: number,
  ): Promise<number | undefined> {
    const byId = this.getCell(headers, row, 'referido_por_contacto_id');
    if (byId) {
      return Number.parseInt(byId, 10);
    }

    const byNombre = this.getCell(
      headers,
      row,
      'referido_por_nombre',
      'referido',
      'referido_por',
    );

    if (!byNombre) {
      return undefined;
    }

    return this.contactosService.findContactoIdByNombre(
      clienteId,
      byNombre,
      paisSesionId,
    );
  }

  private async persistLog(
    entidadTipo: string,
    fileName: string,
    actorId: number,
    detalleCreados: CargaMasivaDetalleCreado[],
    detalleErrores: CargaMasivaFilaError[],
  ): Promise<CargaMasivaResult> {
    const log = this.cargaLogRepository.create({
      entidadTipo,
      usuarioId: actorId,
      archivoNombre: fileName,
      filasExitosas: detalleCreados.length,
      filasRechazadas: detalleErrores.length,
      detalleErrores: detalleErrores.length ? detalleErrores : null,
      detalleCreados: detalleCreados.length ? detalleCreados : null,
      revertida: false,
    });

    const saved = await this.cargaLogRepository.save(log);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.CARGA_MASIVA,
      entidadTipo: AuditEntidadTipo.CARGA_MASIVA,
      entidadId: saved.id,
      valorNuevo: JSON.stringify({
        entidadTipo,
        filasExitosas: detalleCreados.length,
        filasRechazadas: detalleErrores.length,
      }),
    });

    return {
      filasExitosas: detalleCreados.length,
      filasRechazadas: detalleErrores.length,
      detalleErrores,
      detalleCreados,
      logId: saved.id,
    };
  }

  private normalizeHeaderMap(row: string[] | undefined): Map<string, number> {
    if (!row) {
      throw new BusinessException(
        ErrorCode.CARGA_MASIVA_FORMATO_INVALIDO,
        'El archivo no tiene encabezados',
        HttpStatus.BAD_REQUEST,
      );
    }

    const map = new Map<string, number>();
    row.forEach((header, index) => {
      const key = header
        .replace(/^\uFEFF/, '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_');
      if (key) {
        map.set(key, index);
      }
    });
    return map;
  }

  private assertRequiredHeaders(
    headers: Map<string, number>,
    required: Array<string | { name: string; aliases?: string[] }>,
  ): void {
    const missing: string[] = [];

    for (const item of required) {
      const label = typeof item === 'string' ? item : item.name;
      const keys =
        typeof item === 'string' ? [item] : [item.name, ...(item.aliases ?? [])];

      if (!keys.some((key) => headers.has(key))) {
        missing.push(label);
      }
    }

    if (missing.length) {
      const found = [...headers.keys()].join(', ') || '(ninguno)';
      throw new BusinessException(
        ErrorCode.CARGA_MASIVA_FORMATO_INVALIDO,
        `Faltan columnas obligatorias: ${missing.join(', ')}. Encabezados encontrados: ${found}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private hasHeader(headers: Map<string, number>, ...names: string[]): boolean {
    return names.some((name) => headers.has(name));
  }

  private getCell(
    headers: Map<string, number>,
    row: string[],
    ...names: string[]
  ): string {
    for (const name of names) {
      const index = headers.get(name);
      if (index !== undefined) {
        return row[index]?.trim() ?? '';
      }
    }

    return '';
  }

  private async resolveUbicacionId(
    paisSesionId: number,
    departamento: string,
    municipio: string,
  ): Promise<number> {
    const normalizada = normalizeColombiaUbicacionInput(departamento, municipio);
    const dep = normalizada.departamento.trim();
    const mun = normalizada.municipioProvincia.trim();

    if (!dep && !mun) {
      const fallback = await this.ubicacionRepository.findOne({
        where: { paisId: paisSesionId },
        order: { departamento: 'ASC', municipioProvincia: 'ASC' },
      });

      if (!fallback) {
        throw new BusinessException(
          ErrorCode.UBICACION_NO_ENCONTRADA,
          'No hay ubicaciones registradas para el país de la sesión',
          HttpStatus.BAD_REQUEST,
        );
      }

      return fallback.id;
    }

    if (!dep && mun) {
      const municipiosBusqueda = new Set(
        normalizeColombiaUbicacionInput('', mun).municipioProvincia === 'Bogotá'
          ? bogotaMunicipioAliases()
          : [mun],
      );

      for (const municipioBusqueda of municipiosBusqueda) {
        const ubicacion = await this.ubicacionRepository.findOne({
          where: { paisId: paisSesionId, municipioProvincia: municipioBusqueda },
        });

        if (ubicacion) {
          return ubicacion.id;
        }
      }

      const formatted = formatUbicacionCargaMasivaError(dep, mun);
      throw new BusinessException(
        ErrorCode.UBICACION_NO_ENCONTRADA,
        formatted.error,
        HttpStatus.BAD_REQUEST,
        { sugerencia: formatted.sugerencia },
      );
    }

    const qb = this.ubicacionRepository
      .createQueryBuilder('u')
      .where('u.pais_id = :paisSesionId', { paisSesionId })
      .andWhere('u.departamento = :departamento', { departamento: dep });

    if (mun) {
      const municipiosBusqueda = new Set(
        dep && normalizeColombiaUbicacionInput(dep, mun).municipioProvincia === 'Bogotá'
          ? bogotaMunicipioAliases()
          : [mun],
      );

      for (const municipioBusqueda of municipiosBusqueda) {
        const candidato = await this.ubicacionRepository.findOne({
          where: {
            paisId: paisSesionId,
            departamento: dep,
            municipioProvincia: municipioBusqueda,
          },
        });

        if (candidato) {
          return candidato.id;
        }
      }
    }

    const ubicacion = mun ? null : (await qb.getMany())[0];

    if (!ubicacion) {
      const formatted = formatUbicacionCargaMasivaError(dep, mun);
      throw new BusinessException(
        ErrorCode.UBICACION_NO_ENCONTRADA,
        formatted.error,
        HttpStatus.BAD_REQUEST,
        { sugerencia: formatted.sugerencia },
      );
    }

    return ubicacion.id;
  }

  private buildRowError(fila: number, error: unknown): CargaMasivaFilaError {
    const sugerencia = this.extractErrorSuggestion(error);
    const detalle: CargaMasivaFilaError = {
      fila,
      error: this.extractErrorMessage(error),
    };

    if (sugerencia) {
      detalle.sugerencia = sugerencia;
    }

    return detalle;
  }

  private extractErrorSuggestion(error: unknown): string | undefined {
    if (error instanceof BusinessException) {
      const response = error.getResponse();
      if (typeof response === 'object' && response !== null) {
        if (
          'sugerencia' in response &&
          typeof response.sugerencia === 'string' &&
          response.sugerencia.trim()
        ) {
          return response.sugerencia.trim();
        }

        if (
          'errorCode' in response &&
          typeof response.errorCode === 'string'
        ) {
          return sugerenciaPorCodigoError(response.errorCode);
        }
      }
    }

    return undefined;
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof BusinessException) {
      const response = error.getResponse();

      if (
        typeof response === 'object' &&
        response !== null &&
        'message' in response &&
        typeof response.message === 'string'
      ) {
        return response.message;
      }
    }

    if (error instanceof BadRequestException) {
      const response = error.getResponse();
      if (typeof response === 'object' && response !== null && 'message' in response) {
        const message = response.message;
        if (Array.isArray(message)) {
          return message.map(String).join('; ');
        }
        if (typeof message === 'string') {
          return message;
        }
      }
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return 'No fue posible importar la fila. Revise los datos obligatorios.';
  }
}
