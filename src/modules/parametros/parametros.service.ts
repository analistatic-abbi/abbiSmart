import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  AuditAccion,
  AuditEntidadTipo,
} from '../../common/enums/audit-accion.enum';
import { INDICADORES_FINANCIEROS } from '../../common/enums/indicador-codigo.enum';
import { ReglaCumplimiento } from '../../common/enums/regla-cumplimiento.enum';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { ParametroFinanciero } from '../../database/entities/parametro-financiero.entity';
import { AuditService } from '../audit/audit.service';
import {
  CreateParametroDto,
  ParametroPorAnioResponseItemDto,
  ParametrosPorAnioResponseDto,
  ParametroResponseDto,
  ParametrosQueryDto,
  ParametrosPropagacionDto,
  UpdateParametroDto,
  UpsertParametrosPorAnioDto,
} from './dto/parametro.dto';
import { ParametrosDependientesService } from './parametros-dependientes.service';

export interface ParametrosPage {
  data: ParametroResponseDto[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ParametrosService {
  constructor(
    @InjectRepository(ParametroFinanciero)
    private readonly parametroRepository: Repository<ParametroFinanciero>,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
    private readonly dependientesService: ParametrosDependientesService,
  ) {}

  async findAll(
    query: ParametrosQueryDto,
    paisSesionId: number,
  ): Promise<ParametrosPage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const qb = this.parametroRepository
      .createQueryBuilder('p')
      .where('p.pais_id = :paisSesionId', { paisSesionId });

    if (query.indicadorCodigo) {
      qb.andWhere('p.indicador_codigo = :indicadorCodigo', {
        indicadorCodigo: query.indicadorCodigo,
      });
    }

    if (query.anio) {
      qb.andWhere('p.anio = :anio', { anio: query.anio });
    }

    if (query.search) {
      qb.andWhere(
        '(CAST(p.anio AS CHAR) LIKE :search OR p.indicador_codigo LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy('p.indicador_codigo', 'ASC')
      .addOrderBy('p.anio', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [parametros, total] = await qb.getManyAndCount();

    return {
      data: parametros.map((parametro) => this.toResponse(parametro)),
      total,
      page,
      limit,
    };
  }

  async findById(id: number, paisSesionId: number): Promise<ParametroResponseDto> {
    const parametro = await this.getParametroOrFail(id, paisSesionId);
    return this.toResponse(parametro);
  }

  async findVigentePorIndicador(
    paisSesionId: number,
    indicadorCodigo: ParametroFinanciero['indicadorCodigo'],
  ): Promise<ParametroFinanciero | null> {
    return this.parametroRepository
      .createQueryBuilder('p')
      .where('p.pais_id = :paisSesionId', { paisSesionId })
      .andWhere('p.indicador_codigo = :indicadorCodigo', { indicadorCodigo })
      .orderBy('p.anio', 'DESC')
      .getOne();
  }

  async findPorIndicadorYAnio(
    paisSesionId: number,
    indicadorCodigo: ParametroFinanciero['indicadorCodigo'],
    anio: number,
  ): Promise<ParametroFinanciero | null> {
    return this.parametroRepository.findOne({
      where: {
        paisId: paisSesionId,
        indicadorCodigo,
        anio,
      },
    });
  }

  async findPorAnio(
    anio: number,
    paisSesionId: number,
  ): Promise<ParametrosPorAnioResponseDto> {
    const existentes = await this.parametroRepository.find({
      where: { paisId: paisSesionId, anio },
    });

    const porCodigo = new Map(
      existentes.map((parametro) => [parametro.indicadorCodigo, parametro]),
    );

    return {
      anio,
      indicadores: INDICADORES_FINANCIEROS.map((indicadorCodigo) => {
        const parametro = porCodigo.get(indicadorCodigo);
        return this.toPorAnioItem(indicadorCodigo, parametro);
      }),
    };
  }

  async upsertPorAnio(
    anio: number,
    dto: UpsertParametrosPorAnioDto,
    actorId: number,
    paisSesionId: number,
  ): Promise<ParametrosPorAnioResponseDto> {
    const codigos = dto.indicadores.map((item) => item.indicadorCodigo);
    const duplicados = codigos.filter(
      (codigo, index) => codigos.indexOf(codigo) !== index,
    );

    if (duplicados.length > 0) {
      throw new BusinessException(
        ErrorCode.PARAMETRO_DUPLICADO,
        'No puede repetir el mismo indicador en la carga por año',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(ParametroFinanciero);

      for (const item of dto.indicadores) {
        const existente = await repo.findOne({
          where: {
            paisId: paisSesionId,
            indicadorCodigo: item.indicadorCodigo,
            anio,
          },
        });

        if (existente) {
          const valorAnterior = JSON.stringify(this.toResponse(existente));
          existente.valor = item.valor.toString();
          existente.reglaCumplimiento = item.reglaCumplimiento as ReglaCumplimiento;
          existente.usuarioModificoId = actorId;
          const saved = await repo.save(existente);

          await this.auditService.log({
            usuarioId: actorId,
            accion: AuditAccion.PARAMETRO_EDITAR,
            entidadTipo: AuditEntidadTipo.PARAMETRO_FINANCIERO,
            entidadId: saved.id,
            valorAnterior,
            valorNuevo: JSON.stringify(this.toResponse(saved)),
          });
          continue;
        }

        const parametro = repo.create({
          paisId: paisSesionId,
          indicadorCodigo: item.indicadorCodigo,
          anio,
          valor: item.valor.toString(),
          reglaCumplimiento: item.reglaCumplimiento as ReglaCumplimiento,
          usuarioModificoId: actorId,
        });
        const saved = await repo.save(parametro);

        await this.auditService.log({
          usuarioId: actorId,
          accion: AuditAccion.PARAMETRO_CREAR,
          entidadTipo: AuditEntidadTipo.PARAMETRO_FINANCIERO,
          entidadId: saved.id,
          valorNuevo: JSON.stringify(this.toResponse(saved)),
        });
      }
    });

    const indicadoresAfectados = dto.indicadores.map((item) => item.indicadorCodigo);
    const propagacion = await this.dependientesService.propagarCambios(
      paisSesionId,
      anio,
      actorId,
      indicadoresAfectados,
    );

    const response = await this.findPorAnio(anio, paisSesionId);
    response.propagacion = this.toPropagacionDto(propagacion);
    return response;
  }

  async create(
    dto: CreateParametroDto,
    actorId: number,
    paisSesionId: number,
  ): Promise<{ parametro: ParametroResponseDto; propagacion: ParametrosPropagacionDto }> {
    const exists = await this.parametroRepository.findOne({
      where: {
        paisId: paisSesionId,
        indicadorCodigo: dto.indicadorCodigo,
        anio: dto.anio,
      },
    });

    if (exists) {
      throw new BusinessException(
        ErrorCode.PARAMETRO_DUPLICADO,
        'Ya existe un parámetro para ese indicador y año',
        HttpStatus.CONFLICT,
      );
    }

    const parametro = this.parametroRepository.create({
      paisId: paisSesionId,
      indicadorCodigo: dto.indicadorCodigo,
      anio: dto.anio,
      valor: dto.valor.toString(),
      reglaCumplimiento: dto.reglaCumplimiento as ReglaCumplimiento,
      usuarioModificoId: actorId,
    });

    const saved = await this.parametroRepository.save(parametro);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.PARAMETRO_CREAR,
      entidadTipo: AuditEntidadTipo.PARAMETRO_FINANCIERO,
      entidadId: saved.id,
      valorNuevo: JSON.stringify(this.toResponse(saved)),
    });

    const propagacion = await this.dependientesService.propagarCambios(
      paisSesionId,
      dto.anio,
      actorId,
      [dto.indicadorCodigo],
    );

    return {
      parametro: this.toResponse(saved),
      propagacion: this.toPropagacionDto(propagacion),
    };
  }

  async update(
    id: number,
    dto: UpdateParametroDto,
    actorId: number,
    paisSesionId: number,
  ): Promise<{ parametro: ParametroResponseDto; propagacion: ParametrosPropagacionDto }> {
    const parametro = await this.getParametroOrFail(id, paisSesionId);
    const valorAnterior = JSON.stringify(this.toResponse(parametro));

    if (dto.valor !== undefined) {
      parametro.valor = dto.valor.toString();
    }

    if (dto.reglaCumplimiento !== undefined) {
      parametro.reglaCumplimiento = dto.reglaCumplimiento as ReglaCumplimiento;
    }

    parametro.usuarioModificoId = actorId;
    const saved = await this.parametroRepository.save(parametro);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.PARAMETRO_EDITAR,
      entidadTipo: AuditEntidadTipo.PARAMETRO_FINANCIERO,
      entidadId: saved.id,
      valorAnterior,
      valorNuevo: JSON.stringify(this.toResponse(saved)),
    });

    const propagacion = await this.dependientesService.propagarCambios(
      paisSesionId,
      saved.anio,
      actorId,
      [saved.indicadorCodigo],
    );

    return {
      parametro: this.toResponse(saved),
      propagacion: this.toPropagacionDto(propagacion),
    };
  }

  async remove(id: number, actorId: number, paisSesionId: number): Promise<void> {
    const parametro = await this.getParametroOrFail(id, paisSesionId);
    const valorAnterior = JSON.stringify(this.toResponse(parametro));

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.PARAMETRO_ELIMINAR,
      entidadTipo: AuditEntidadTipo.PARAMETRO_FINANCIERO,
      entidadId: parametro.id,
      valorAnterior,
    });

    await this.parametroRepository.remove(parametro);
  }

  async getHistorial(id: number, paisSesionId: number) {
    await this.getParametroOrFail(id, paisSesionId);

    return this.auditService.findByEntidad(
      AuditEntidadTipo.PARAMETRO_FINANCIERO,
      id,
    );
  }

  private async getParametroOrFail(
    id: number,
    paisSesionId: number,
  ): Promise<ParametroFinanciero> {
    const parametro = await this.parametroRepository.findOne({ where: { id } });

    if (!parametro || Number(parametro.paisId) !== Number(paisSesionId)) {
      throw new BusinessException(
        ErrorCode.PARAMETRO_NO_ENCONTRADO,
        'Parámetro financiero no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    return parametro;
  }

  toResponse(parametro: ParametroFinanciero): ParametroResponseDto {
    return {
      id: parametro.id,
      paisId: parametro.paisId,
      indicadorCodigo: parametro.indicadorCodigo,
      anio: parametro.anio,
      valor: parametro.valor,
      reglaCumplimiento: parametro.reglaCumplimiento,
      usuarioModificoId: parametro.usuarioModificoId,
      fechaModificacion: parametro.fechaModificacion,
    };
  }

  private toPorAnioItem(
    indicadorCodigo: ParametroFinanciero['indicadorCodigo'],
    parametro?: ParametroFinanciero,
  ): ParametroPorAnioResponseItemDto {
    if (!parametro) {
      return {
        indicadorCodigo,
        id: null,
        valor: null,
        reglaCumplimiento: null,
        fechaModificacion: null,
      };
    }

    return {
      indicadorCodigo,
      id: parametro.id,
      valor: parametro.valor,
      reglaCumplimiento: parametro.reglaCumplimiento,
      fechaModificacion: parametro.fechaModificacion,
    };
  }

  private toPropagacionDto(
    result: {
      indicadoresActualizados: number;
      calificacionesActualizadas: number;
      calificacionesOmitidas: number;
    },
  ): ParametrosPropagacionDto {
    return {
      indicadoresActualizados: result.indicadoresActualizados,
      calificacionesActualizadas: result.calificacionesActualizadas,
      calificacionesOmitidas: result.calificacionesOmitidas,
    };
  }
}
