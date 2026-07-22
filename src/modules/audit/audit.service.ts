import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { LogAuditoria } from '../../database/entities/log-auditoria.entity';
import { AuditQueryDto } from './dto/audit-query.dto';
import { AuditLogResponseDto } from './dto/audit-log-response.dto';

export interface AuditLogInput {
  usuarioId?: number | null;
  accion: string;
  entidadTipo: string;
  entidadId?: number | null;
  campo?: string | null;
  valorAnterior?: string | null;
  valorNuevo?: string | null;
}

export interface AuditLogPage {
  data: AuditLogResponseDto[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(LogAuditoria)
    private readonly logRepository: Repository<LogAuditoria>,
  ) {}

  async log(input: AuditLogInput): Promise<void> {
    try {
      const entry = this.logRepository.create({
        usuarioId: input.usuarioId ?? null,
        accion: input.accion,
        entidadTipo: input.entidadTipo,
        entidadId: input.entidadId ?? null,
        campo: input.campo ?? null,
        valorAnterior: input.valorAnterior ?? null,
        valorNuevo: input.valorNuevo ?? null,
      });

      await this.logRepository.save(entry);
    } catch (error) {
      this.logger.error(
        `No se pudo registrar auditoría (${input.accion})`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async findAll(query: AuditQueryDto): Promise<AuditLogPage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: FindOptionsWhere<LogAuditoria> = {};

    if (query.usuarioId) {
      where.usuarioId = query.usuarioId;
    }

    if (query.entidadTipo) {
      where.entidadTipo = query.entidadTipo;
    }

    if (query.accion) {
      where.accion = query.accion;
    }

    if (query.entidadId) {
      where.entidadId = query.entidadId;
    }

    if (query.fechaDesde && query.fechaHasta) {
      where.fechaHora = Between(
        new Date(query.fechaDesde),
        new Date(query.fechaHasta),
      );
    } else if (query.fechaDesde) {
      where.fechaHora = MoreThanOrEqual(new Date(query.fechaDesde));
    } else if (query.fechaHasta) {
      where.fechaHora = LessThanOrEqual(new Date(query.fechaHasta));
    }

    const [rows, total] = await this.logRepository.findAndCount({
      where,
      order: { fechaHora: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: rows.map((row) => AuditLogResponseDto.fromEntity(row)),
      total,
      page,
      limit,
    };
  }

  async findByEntidad(
    entidadTipo: string,
    entidadId: number,
    options?: { accion?: string; limit?: number },
  ): Promise<AuditLogResponseDto[]> {
    const where: FindOptionsWhere<LogAuditoria> = { entidadTipo, entidadId };

    if (options?.accion) {
      where.accion = options.accion;
    }

    const rows = await this.logRepository.find({
      where,
      order: { fechaHora: 'DESC', id: 'DESC' },
      take: options?.limit ?? 50,
    });

    return rows.map((row) => AuditLogResponseDto.fromEntity(row));
  }
}
