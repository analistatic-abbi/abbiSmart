import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Rol } from '../../common/enums/rol.enum';
import {
  AuditAccion,
  AuditEntidadTipo,
} from '../../common/enums/audit-accion.enum';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { Pais } from '../../database/entities/pais.entity';
import { UbicacionGeografica } from '../../database/entities/ubicacion-geografica.entity';
import { AuditService } from '../audit/audit.service';
import {
  DepartamentosQueryDto,
  PaisesQueryDto,
  UbicacionesQueryDto,
} from './dto/catalogos-query.dto';
import { CreatePaisDto } from './dto/create-pais.dto';
import { PaisResponseDto } from './dto/pais-response.dto';
import { UbicacionResponseDto } from './dto/ubicacion-response.dto';
import { UpdatePaisDto } from './dto/update-pais.dto';

export interface UbicacionesPage {
  data: UbicacionResponseDto[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class CatalogosService {
  constructor(
    @InjectRepository(Pais)
    private readonly paisRepository: Repository<Pais>,
    @InjectRepository(UbicacionGeografica)
    private readonly ubicacionRepository: Repository<UbicacionGeografica>,
    private readonly auditService: AuditService,
  ) {}

  async findAllPaises(query: PaisesQueryDto): Promise<PaisResponseDto[]> {
    const where: FindOptionsWhere<Pais> = {};

    if (query.activo !== undefined) {
      where.activo = query.activo;
    }

    const paises = await this.paisRepository.find({
      where,
      order: { nombre: 'ASC' },
    });

    return paises.map((pais) => this.toPaisResponse(pais));
  }

  async findPaisById(id: number): Promise<PaisResponseDto> {
    const pais = await this.paisRepository.findOne({ where: { id } });

    if (!pais) {
      throw new BusinessException(
        ErrorCode.PAIS_NO_ENCONTRADO,
        'País no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    return this.toPaisResponse(pais);
  }

  async createPais(
    dto: CreatePaisDto,
    actorId: number,
  ): Promise<PaisResponseDto> {
    const exists = await this.paisRepository.exists({
      where: { nombre: dto.nombre },
    });

    if (exists) {
      throw new BusinessException(
        ErrorCode.PAIS_DUPLICADO,
        'Ya existe un país con ese nombre',
        HttpStatus.CONFLICT,
      );
    }

    const pais = this.paisRepository.create({
      nombre: dto.nombre,
      activo: dto.activo ?? true,
    });

    const saved = await this.paisRepository.save(pais);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.PAIS_CREAR,
      entidadTipo: AuditEntidadTipo.PAIS,
      entidadId: saved.id,
      valorNuevo: JSON.stringify(this.toPaisResponse(saved)),
    });

    return this.toPaisResponse(saved);
  }

  async updatePais(
    id: number,
    dto: UpdatePaisDto,
    actorId: number,
  ): Promise<PaisResponseDto> {
    const pais = await this.paisRepository.findOne({ where: { id } });

    if (!pais) {
      throw new BusinessException(
        ErrorCode.PAIS_NO_ENCONTRADO,
        'País no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    const valorAnterior = JSON.stringify(this.toPaisResponse(pais));

    if (dto.nombre !== undefined && dto.nombre !== pais.nombre) {
      const duplicate = await this.paisRepository.exists({
        where: { nombre: dto.nombre },
      });

      if (duplicate) {
        throw new BusinessException(
          ErrorCode.PAIS_DUPLICADO,
          'Ya existe un país con ese nombre',
          HttpStatus.CONFLICT,
        );
      }

      pais.nombre = dto.nombre;
    }

    if (dto.activo !== undefined) {
      pais.activo = dto.activo;
    }

    const saved = await this.paisRepository.save(pais);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.PAIS_EDITAR,
      entidadTipo: AuditEntidadTipo.PAIS,
      entidadId: saved.id,
      valorAnterior,
      valorNuevo: JSON.stringify(this.toPaisResponse(saved)),
    });

    return this.toPaisResponse(saved);
  }

  async findUbicaciones(
    query: UbicacionesQueryDto,
    paisSesionId: number,
    rol: Rol,
  ): Promise<UbicacionesPage> {
    const paisId = this.resolvePaisId(query.paisId, paisSesionId, rol);
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const qb = this.ubicacionRepository
      .createQueryBuilder('u')
      .where('u.pais_id = :paisId', { paisId });

    if (query.departamento) {
      qb.andWhere('u.departamento = :departamento', {
        departamento: query.departamento,
      });
    }

    qb.orderBy('u.departamento', 'ASC')
      .addOrderBy('u.municipio_provincia', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [ubicaciones, total] = await qb.getManyAndCount();

    return {
      data: ubicaciones.map((ubicacion) => this.toUbicacionResponse(ubicacion)),
      total,
      page,
      limit,
    };
  }

  async findDepartamentos(
    query: DepartamentosQueryDto,
    paisSesionId: number,
    rol: Rol,
  ): Promise<string[]> {
    const paisId = this.resolvePaisId(query.paisId, paisSesionId, rol);

    const rows = await this.ubicacionRepository
      .createQueryBuilder('u')
      .select('DISTINCT u.departamento', 'departamento')
      .where('u.pais_id = :paisId', { paisId })
      .orderBy('u.departamento', 'ASC')
      .getRawMany<{ departamento: string }>();

    return rows.map((row) => row.departamento);
  }

  async findUbicacionById(
    id: number,
    paisSesionId: number,
    rol: Rol,
  ): Promise<UbicacionResponseDto> {
    const ubicacion = await this.ubicacionRepository.findOne({ where: { id } });

    if (!ubicacion) {
      throw new BusinessException(
        ErrorCode.UBICACION_NO_ENCONTRADA,
        'Ubicación geográfica no encontrada',
        HttpStatus.NOT_FOUND,
      );
    }

    this.assertPaisAccesible(ubicacion.paisId, paisSesionId, rol);

    return this.toUbicacionResponse(ubicacion);
  }

  private resolvePaisId(
    requestedPaisId: number | undefined,
    paisSesionId: number,
    rol: Rol,
  ): number {
    if (requestedPaisId === undefined) {
      return paisSesionId;
    }

    this.assertPaisAccesible(requestedPaisId, paisSesionId, rol);

    return requestedPaisId;
  }

  private assertPaisAccesible(
    targetPaisId: number,
    paisSesionId: number,
    rol: Rol,
  ): void {
    if (rol === Rol.ADMINISTRADOR) {
      return;
    }

    if (targetPaisId !== paisSesionId) {
      throw new BusinessException(
        ErrorCode.PERMISO_DENEGADO,
        'No puede consultar catálogos de otro país',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private toPaisResponse(pais: Pais): PaisResponseDto {
    return {
      id: pais.id,
      nombre: pais.nombre,
      activo: pais.activo,
    };
  }

  private toUbicacionResponse(
    ubicacion: UbicacionGeografica,
  ): UbicacionResponseDto {
    return {
      id: ubicacion.id,
      paisId: ubicacion.paisId,
      departamento: ubicacion.departamento,
      municipioProvincia: ubicacion.municipioProvincia,
    };
  }
}
