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
    content: string,
    actorId: number,
    paisSesionId: number,
  ): Promise<CargaMasivaResult> {
    await this.assertCargaHabilitada();

    const rows = this.parseCsv(content);
    this.assertHeaders(rows[0], [
      'empresa',
      'ubicacion_id',
      'segmento',
      'segmento_otro',
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
        const dto: CreateClienteDto = {
          empresa: row[0]?.trim() ?? '',
          ubicacionId: Number.parseInt(row[1] ?? '', 10),
          segmento: row[2]?.trim() as SegmentoCliente,
          segmentoOtro: row[3]?.trim() || undefined,
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
    content: string,
    actorId: number,
    paisSesionId: number,
  ): Promise<CargaMasivaResult> {
    await this.assertCargaHabilitada();

    const rows = this.parseCsv(content);
    this.assertHeaders(rows[0], [
      'cliente_id',
      'nombre',
      'ubicacion_id',
      'cargo',
      'telefono',
      'correo',
      'referido_por_contacto_id',
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
        const clienteId = Number.parseInt(row[0] ?? '', 10);
        const dto: CreateContactoDto = {
          nombre: row[1]?.trim() ?? '',
          ubicacionId: Number.parseInt(row[2] ?? '', 10),
          cargo: row[3]?.trim() || undefined,
          telefono: row[4]?.trim() || undefined,
          correo: row[5]?.trim() || undefined,
          referidoPorContactoId: row[6]?.trim()
            ? Number.parseInt(row[6], 10)
            : undefined,
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
    content: string,
    actorId: number,
    paisSesionId: number,
  ): Promise<CargaMasivaResult> {
    await this.assertCargaHabilitada();

    const rows = this.parseCsv(content);
    this.assertHeaders(rows[0], [
      'anio_proyectado',
      'fecha_estimada_publicacion',
      'valor_venta',
      'valor_facturacion',
      'mercado',
      'proceso_origen_id',
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
        const dto: CreateProyeccionDto = {
          anioProyectado: Number.parseInt(row[0] ?? '', 10),
          fechaEstimadaPublicacion: row[1]?.trim() ?? '',
          valorVenta: Number.parseFloat(row[2] ?? ''),
          valorFacturacion: Number.parseFloat(row[3] ?? ''),
          mercado: row[4]?.trim()
            ? (row[4].trim() as MercadoProyeccion)
            : undefined,
          procesoOrigenId: row[5]?.trim()
            ? Number.parseInt(row[5], 10)
            : undefined,
        };

        await this.proyeccionesService.create(dto, actorId, paisSesionId);
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

  private parseCsv(content: string): string[][] {
    const normalized = content.replace(/^\uFEFF/, '').trim();

    if (!normalized) {
      throw new BusinessException(
        ErrorCode.CARGA_MASIVA_FORMATO_INVALIDO,
        'El archivo CSV está vacío',
        HttpStatus.BAD_REQUEST,
      );
    }

    return normalized
      .split(/\r?\n/)
      .map((line) => line.split(',').map((cell) => cell.trim()));
  }

  private assertHeaders(actual: string[] | undefined, expected: string[]): void {
    if (!actual) {
      throw new BusinessException(
        ErrorCode.CARGA_MASIVA_FORMATO_INVALIDO,
        'El archivo CSV no tiene encabezados',
        HttpStatus.BAD_REQUEST,
      );
    }

    const normalized = actual.map((header) => header.toLowerCase());

    for (const header of expected) {
      if (!normalized.includes(header)) {
        throw new BusinessException(
          ErrorCode.CARGA_MASIVA_FORMATO_INVALIDO,
          `Falta la columna requerida: ${header}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
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
