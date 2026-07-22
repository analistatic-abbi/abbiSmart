import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuditAccion,
  AuditEntidadTipo,
} from '../../common/enums/audit-accion.enum';
import { SegmentoCliente } from '../../common/enums/segmento-cliente.enum';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { UbicacionGeografica } from '../../database/entities/ubicacion-geografica.entity';
import { Pais } from '../../database/entities/pais.entity';
import { CargaMasivaLog } from '../../database/entities/carga-masiva-log.entity';
import { AuditService } from '../audit/audit.service';
import { ClientesService } from '../clientes/clientes.service';
import { ConfiguracionService } from '../configuracion/configuracion.service';
import { ContactosService } from '../contactos/contactos.service';
import { ProyeccionesService } from '../proyecciones/proyecciones.service';
import { CreateClienteDto } from '../clientes/dto/create-cliente.dto';
import { CreateContactoDto } from '../contactos/dto/create-contacto.dto';
import { CreateProyeccionDto } from '../proyecciones/dto/proyeccion.dto';
import { MercadoProyeccion } from '../../common/enums/mercado-proyeccion.enum';
import { readSpreadsheet } from '../../common/utils/spreadsheet-reader';

export interface CargaMasivaResult {
  filasExitosas: number;
  filasRechazadas: number;
  detalleErrores: Array<{ fila: number; error: string }>;
  logId: number;
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
    private readonly configuracionService: ConfiguracionService,
    private readonly clientesService: ClientesService,
    private readonly contactosService: ContactosService,
    private readonly proyeccionesService: ProyeccionesService,
    private readonly auditService: AuditService,
  ) {}

  async findLogs(usuarioId?: number): Promise<CargaMasivaLog[]> {
    const where = usuarioId ? { usuarioId } : {};

    return this.cargaLogRepository.find({
      where,
      order: { fechaCarga: 'DESC' },
      take: 50,
    });
  }

  async importClientes(
    fileName: string,
    buffer: Buffer,
    actorId: number,
    paisSesionId: number,
  ): Promise<CargaMasivaResult> {
    await this.assertCargaHabilitada();

    const rows = await readSpreadsheet(buffer, fileName);
    const headers = this.normalizeHeaderMap(rows[0]);
    this.assertHeaderSet(headers, [
      ['empresa', 'ubicacion_id', 'segmento'],
      ['empresa', 'region', 'segmento'],
      ['empresa', 'departamento', 'segmento'],
      ['empresa', 'pais', 'region', 'segmento'],
      ['empresa', 'país', 'region', 'segmento'],
      ['empresa', 'pais', 'departamento', 'segmento'],
    ]);

    const detalleErrores: Array<{ fila: number; error: string }> = [];
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
        const ubicacionId = headers.has('ubicacion_id')
          ? Number.parseInt(this.getCell(headers, row, 'ubicacion_id'), 10)
          : await this.resolveUbicacionId(
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
          segmento: this.getCell(headers, row, 'segmento') as SegmentoCliente,
          segmentoOtro:
            this.getCell(headers, row, 'segmento_otro') || undefined,
        };

        await this.clientesService.create(dto, actorId, paisSesionId);
        filasExitosas += 1;
      } catch (error) {
        detalleErrores.push({
          fila,
          error: this.extractErrorMessage(error),
        });
      }
    }

    return this.persistLog(
      'cliente',
      fileName,
      actorId,
      filasExitosas,
      detalleErrores,
    );
  }

  async importContactos(
    fileName: string,
    buffer: Buffer,
    actorId: number,
    paisSesionId: number,
  ): Promise<CargaMasivaResult> {
    await this.assertCargaHabilitada();

    const rows = await readSpreadsheet(buffer, fileName);
    const headers = this.normalizeHeaderMap(rows[0]);
    this.assertHeaderSet(headers, [
      ['cliente_id', 'nombre', 'ubicacion_id'],
      ['empresa', 'nombre', 'region'],
      ['empresa', 'nombre', 'departamento'],
    ]);

    const detalleErrores: Array<{ fila: number; error: string }> = [];
    let filasExitosas = 0;

    for (let index = 1; index < rows.length; index++) {
      const row = rows[index];
      const fila = index + 1;

      if (row.every((cell) => !cell.trim())) {
        continue;
      }

      try {
        const clienteId = headers.has('cliente_id')
          ? Number.parseInt(this.getCell(headers, row, 'cliente_id'), 10)
          : await this.clientesService.findClienteIdByEmpresa(
              this.getCell(headers, row, 'empresa'),
              paisSesionId,
            );

        const ubicacionId = headers.has('ubicacion_id')
          ? Number.parseInt(this.getCell(headers, row, 'ubicacion_id'), 10)
          : await this.resolveUbicacionId(
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

        await this.contactosService.create(
          clienteId,
          dto,
          actorId,
          paisSesionId,
        );
        filasExitosas += 1;
      } catch (error) {
        detalleErrores.push({
          fila,
          error: this.extractErrorMessage(error),
        });
      }
    }

    return this.persistLog(
      'contacto',
      fileName,
      actorId,
      filasExitosas,
      detalleErrores,
    );
  }

  async importProyecciones(
    fileName: string,
    buffer: Buffer,
    actorId: number,
    paisSesionId: number,
  ): Promise<CargaMasivaResult> {
    await this.assertCargaHabilitada();

    const rows = await readSpreadsheet(buffer, fileName);
    const headers = this.normalizeHeaderMap(rows[0]);
    this.assertHeaderSet(headers, [
      ['anio_proyectado', 'fecha_estimada_publicacion', 'valor_venta', 'valor_facturacion'],
      [
        'anio_proyectado',
        'fecha_estimada_publicacion',
        'valor_venta',
        'valor_facturacion',
        'proceso_origen_id',
      ],
      [
        'anio_proyectado',
        'fecha_estimada_publicacion',
        'valor_venta',
        'valor_facturacion',
        'proceso_codigo',
      ],
    ]);

    const detalleErrores: Array<{ fila: number; error: string }> = [];
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

        const procesoOrigenId = procesoRef
          ? await this.proyeccionesService.resolveProcesoOrigenIdForCarga(
              procesoRef,
              paisSesionId,
            )
          : undefined;

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
          procesoOrigenId,
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

        filasExitosas += 1;
      } catch (error) {
        detalleErrores.push({
          fila,
          error: this.extractErrorMessage(error),
        });
      }
    }

    return this.persistLog(
      'proyeccion',
      fileName,
      actorId,
      filasExitosas,
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

  private async assertCargaHabilitada(): Promise<void> {
    const config = await this.configuracionService.findByClave(
      'carga_masiva_habilitada',
    );

    if (config.valor !== 'true') {
      throw new BusinessException(
        ErrorCode.CARGA_MASIVA_DESHABILITADA,
        'La carga masiva está deshabilitada por configuración del sistema',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private async persistLog(
    entidadTipo: string,
    fileName: string,
    actorId: number,
    filasExitosas: number,
    detalleErrores: Array<{ fila: number; error: string }>,
  ): Promise<CargaMasivaResult> {
    const log = this.cargaLogRepository.create({
      entidadTipo,
      usuarioId: actorId,
      archivoNombre: fileName,
      filasExitosas,
      filasRechazadas: detalleErrores.length,
      detalleErrores: detalleErrores.length ? detalleErrores : null,
    });

    const saved = await this.cargaLogRepository.save(log);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.CARGA_MASIVA,
      entidadTipo: AuditEntidadTipo.CARGA_MASIVA,
      entidadId: saved.id,
      valorNuevo: JSON.stringify({
        entidadTipo,
        filasExitosas,
        filasRechazadas: detalleErrores.length,
      }),
    });

    return {
      filasExitosas,
      filasRechazadas: detalleErrores.length,
      detalleErrores,
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
      map.set(header.trim().toLowerCase(), index);
    });
    return map;
  }

  private assertHeaderSet(
    headers: Map<string, number>,
    alternatives: string[][],
  ): void {
    const matches = alternatives.some((set) =>
      set.every((column) => headers.has(column)),
    );

    if (!matches) {
      throw new BusinessException(
        ErrorCode.CARGA_MASIVA_FORMATO_INVALIDO,
        'Las columnas del archivo no coinciden con ningún formato soportado',
        HttpStatus.BAD_REQUEST,
      );
    }
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
    if (!departamento.trim()) {
      throw new BusinessException(
        ErrorCode.UBICACION_NO_ENCONTRADA,
        'Debe indicar departamento o región para resolver la ubicación',
        HttpStatus.BAD_REQUEST,
      );
    }

    const qb = this.ubicacionRepository
      .createQueryBuilder('u')
      .where('u.pais_id = :paisSesionId', { paisSesionId })
      .andWhere('u.departamento = :departamento', { departamento });

    if (municipio.trim()) {
      qb.andWhere('u.municipio_provincia = :municipio', { municipio });
    }

    const ubicacion = municipio.trim()
      ? await qb.getOne()
      : (await qb.getMany())[0];

    if (!ubicacion) {
      throw new BusinessException(
        ErrorCode.UBICACION_NO_ENCONTRADA,
        'No se encontró la ubicación indicada en el archivo',
        HttpStatus.BAD_REQUEST,
      );
    }

    return ubicacion.id;
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

    return 'Error al procesar la fila';
  }
}
