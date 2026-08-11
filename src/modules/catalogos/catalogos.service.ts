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
import {
  findWorldCountryByIso,
  getWorldCountries,
} from '../../common/data/world-countries.util';
import { PAIS_CONFIG_CALIFICACION_PUNTOS } from '../../common/constants/pais-config.constants';
import { CATALOGOS_NEGOCIO, CatalogoPaisTipo } from '../../common/enums/catalogo-pais-tipo.enum';
import { CatalogoPais } from '../../database/entities/catalogo-pais.entity';
import { ConfiguracionPais } from '../../database/entities/configuracion-pais.entity';
import { Pais } from '../../database/entities/pais.entity';
import { PlantillaTareaPais } from '../../database/entities/plantilla-tarea-pais.entity';
import { UbicacionGeografica } from '../../database/entities/ubicacion-geografica.entity';
import { AuditService } from '../audit/audit.service';
import {
  DepartamentosQueryDto,
  PaisesQueryDto,
  UbicacionesQueryDto,
} from './dto/catalogos-query.dto';
import { CreatePaisDto } from './dto/create-pais.dto';
import { PaisResponseDto, PaisReferenciaDto } from './dto/pais-response.dto';
import { UbicacionResponseDto } from './dto/ubicacion-response.dto';
import { UpdatePaisDto } from './dto/update-pais.dto';
import {
  CatalogoPaisItem,
  CatalogoPaisService,
} from './catalogo-pais.service';
import {
  ConfiguracionPaisItem,
  PaisCapabilities,
  PaisConfigService,
  PlantillaTareaItem,
} from './pais-config.service';
import { PaisOnboardingService } from './pais-onboarding.service';
import {
  SeedUbicacionesResult,
  UbicacionesSeederService,
} from './ubicaciones-seeder.service';

export interface CreatePaisResult {
  pais: PaisResponseDto;
  onboarding: {
    ubicaciones: SeedUbicacionesResult;
    tareasPlantilla: number;
    configItems: number;
    catalogosItems: number;
    parametrosClonados: number;
  };
}

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
    @InjectRepository(PlantillaTareaPais)
    private readonly plantillaRepository: Repository<PlantillaTareaPais>,
    @InjectRepository(ConfiguracionPais)
    private readonly configPaisRepository: Repository<ConfiguracionPais>,
    @InjectRepository(CatalogoPais)
    private readonly catalogoPaisEntityRepository: Repository<CatalogoPais>,
    private readonly auditService: AuditService,
    private readonly ubicacionesSeeder: UbicacionesSeederService,
    private readonly paisOnboardingService: PaisOnboardingService,
    private readonly paisConfigService: PaisConfigService,
    private readonly catalogoPaisService: CatalogoPaisService,
  ) {}

  async findPaisesReferencia(): Promise<PaisReferenciaDto[]> {
    return getWorldCountries();
  }

  async findAllPaises(query: PaisesQueryDto): Promise<PaisResponseDto[]> {
    const where: FindOptionsWhere<Pais> = {};

    if (query.activo !== undefined) {
      where.activo = query.activo;
    }

    const paises = await this.paisRepository.find({
      where,
      order: { nombre: 'ASC' },
    });

    if (paises.length === 0) {
      return [];
    }

    const counts = await this.ubicacionRepository
      .createQueryBuilder('u')
      .select('u.pais_id', 'paisId')
      .addSelect('COUNT(*)', 'total')
      .where('u.pais_id IN (:...ids)', { ids: paises.map((pais) => pais.id) })
      .groupBy('u.pais_id')
      .getRawMany<{ paisId: string; total: string }>();

    const countMap = new Map(
      counts.map((row) => [Number(row.paisId), Number(row.total)]),
    );

    const plantillaCounts = await this.plantillaRepository
      .createQueryBuilder('pt')
      .select('pt.pais_id', 'paisId')
      .addSelect('COUNT(*)', 'total')
      .where('pt.pais_id IN (:...ids)', { ids: paises.map((pais) => pais.id) })
      .groupBy('pt.pais_id')
      .getRawMany<{ paisId: string; total: string }>();

    const plantillaMap = new Map(
      plantillaCounts.map((row) => [Number(row.paisId), Number(row.total)]),
    );

    const calificacionFlags = await this.configPaisRepository.find({
      where: paises.map((pais) => ({
        paisId: pais.id,
        clave: PAIS_CONFIG_CALIFICACION_PUNTOS,
      })),
    });

    const calificacionMap = new Map(
      calificacionFlags.map((item) => [
        Number(item.paisId),
        item.valor === 'true' || item.valor === '1',
      ]),
    );

    const catalogoCounts = await this.catalogoPaisEntityRepository
      .createQueryBuilder('c')
      .select('c.pais_id', 'paisId')
      .addSelect('COUNT(*)', 'total')
      .where('c.pais_id IN (:...ids)', { ids: paises.map((pais) => pais.id) })
      .andWhere('c.tipo IN (:...tipos)', { tipos: CATALOGOS_NEGOCIO })
      .andWhere('c.activo = 1')
      .groupBy('c.pais_id')
      .getRawMany<{ paisId: string; total: string }>();

    const catalogoMap = new Map(
      catalogoCounts.map((row) => [Number(row.paisId), Number(row.total)]),
    );

    return paises.map((pais) => {
      const ubicacionesCount = countMap.get(Number(pais.id)) ?? 0;
      const plantillaTareasCount = plantillaMap.get(Number(pais.id)) ?? 0;
      const catalogosActivosCount = catalogoMap.get(Number(pais.id)) ?? 0;
      const listoOperacion =
        ubicacionesCount > 0 &&
        plantillaTareasCount > 0 &&
        catalogosActivosCount > 0;
      const advertencias: string[] = [];

      if (ubicacionesCount === 0) {
        advertencias.push('Sin ubicaciones geográficas');
      }
      if (plantillaTareasCount === 0) {
        advertencias.push('Sin plantilla de tareas');
      }
      if (catalogosActivosCount === 0) {
        advertencias.push('Sin catálogos de negocio');
      }

      return this.toPaisResponse({
        ...pais,
        ubicacionesCount,
        plantillaTareasCount,
        catalogosActivosCount,
        calificacionPorPuntosHabilitada:
          calificacionMap.get(Number(pais.id)) ?? false,
        listoOperacion,
        advertencias,
      });
    });
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
  ): Promise<CreatePaisResult> {
    const referencia = findWorldCountryByIso(dto.codigoIso);

    if (!referencia) {
      throw new BusinessException(
        ErrorCode.PAIS_NO_ENCONTRADO,
        'El código ISO del país no es válido',
        HttpStatus.BAD_REQUEST,
      );
    }

    const codigoIso = referencia.iso;

    const existsByIso = await this.paisRepository.exists({
      where: { codigoIso },
    });

    if (existsByIso) {
      throw new BusinessException(
        ErrorCode.PAIS_DUPLICADO,
        'Ya existe un país habilitado con ese código ISO',
        HttpStatus.CONFLICT,
      );
    }

    const nombre = dto.nombre?.trim() || referencia.nombre;

    const existsByName = await this.paisRepository.exists({
      where: { nombre },
    });

    if (existsByName) {
      throw new BusinessException(
        ErrorCode.PAIS_DUPLICADO,
        'Ya existe un país con ese nombre',
        HttpStatus.CONFLICT,
      );
    }

    const pais = this.paisRepository.create({
      nombre,
      codigoIso,
      codigoMoneda: referencia.codigoMoneda,
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

    const onboarding = await this.paisOnboardingService.onboard(
      saved.id,
      saved.codigoIso!,
      actorId,
    );

    const calificacionPorPuntos =
      await this.paisConfigService.habilitaCalificacionPorPuntos(saved.id);

    return {
      pais: {
        ...this.toPaisResponse(saved),
        ubicacionesCount: onboarding.ubicaciones.total,
        calificacionPorPuntosHabilitada: calificacionPorPuntos,
        plantillaTareasCount: onboarding.tareasPlantilla,
      },
      onboarding,
    };
  }

  async sincronizarUbicacionesPais(
    id: number,
  ): Promise<{ pais: PaisResponseDto; ubicaciones: SeedUbicacionesResult }> {
    const pais = await this.paisRepository.findOne({ where: { id } });

    if (!pais) {
      throw new BusinessException(
        ErrorCode.PAIS_NO_ENCONTRADO,
        'País no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    if (!pais.codigoIso) {
      throw new BusinessException(
        ErrorCode.PAIS_NO_ENCONTRADO,
        'El país no tiene código ISO para cargar ubicaciones',
        HttpStatus.BAD_REQUEST,
      );
    }

    const ubicaciones = await this.ubicacionesSeeder.seedForCountry(
      pais.id,
      pais.codigoIso,
    );

    const ubicacionesCount = await this.ubicacionRepository.count({
      where: { paisId: pais.id },
    });

    return {
      pais: {
        ...this.toPaisResponse(pais),
        ubicacionesCount,
      },
      ubicaciones,
    };
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

  async findCatalogoSesion(
    paisSesionId: number,
    tipo: CatalogoPaisTipo,
    soloActivos = true,
  ): Promise<CatalogoPaisItem[]> {
    return this.catalogoPaisService.findByTipo(paisSesionId, tipo, soloActivos);
  }

  async findCatalogoPais(
    paisId: number,
    tipo?: CatalogoPaisTipo,
    soloActivos = false,
  ): Promise<CatalogoPaisItem[]> {
    await this.findPaisEntityOrFail(paisId);

    if (tipo) {
      return this.catalogoPaisService.findByTipo(paisId, tipo, soloActivos);
    }

    return this.catalogoPaisService.findAll(paisId, soloActivos);
  }

  async createCatalogoPais(
    paisId: number,
    data: {
      tipo: CatalogoPaisTipo;
      codigo?: string;
      etiqueta: string;
      orden?: number;
    },
    actorId: number,
  ): Promise<CatalogoPaisItem> {
    await this.findPaisEntityOrFail(paisId);
    const item = await this.catalogoPaisService.createItem(paisId, data);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.CATALOGO_PAIS_CREAR,
      entidadTipo: AuditEntidadTipo.CATALOGO_PAIS,
      entidadId: item.id,
      valorNuevo: JSON.stringify(item),
    });

    return item;
  }

  async updateCatalogoPais(
    paisId: number,
    itemId: number,
    patch: Parameters<CatalogoPaisService['updateItem']>[2],
    actorId: number,
  ): Promise<CatalogoPaisItem> {
    await this.findPaisEntityOrFail(paisId);
    const item = await this.catalogoPaisService.updateItem(paisId, itemId, patch);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.CATALOGO_PAIS_EDITAR,
      entidadTipo: AuditEntidadTipo.CATALOGO_PAIS,
      entidadId: item.id,
      valorNuevo: JSON.stringify(item),
    });

    return item;
  }

  async resyncOnboardingPais(
    id: number,
    actorId: number,
  ): Promise<{ message: string; onboarding: CreatePaisResult['onboarding'] }> {
    const pais = await this.findPaisEntityOrFail(id);

    if (!pais.codigoIso) {
      throw new BusinessException(
        ErrorCode.PAIS_NO_ENCONTRADO,
        'El país no tiene código ISO',
        HttpStatus.BAD_REQUEST,
      );
    }

    const onboarding = await this.paisOnboardingService.resyncParcial(
      id,
      pais.codigoIso,
      actorId,
    );

    return {
      message: 'Re-sincronización parcial completada',
      onboarding,
    };
  }

  async clonarConfiguracionPais(
    paisDestinoId: number,
    paisOrigenId: number,
    actorId: number,
  ) {
    await this.findPaisEntityOrFail(paisDestinoId);
    await this.findPaisEntityOrFail(paisOrigenId);

    const result = await this.paisOnboardingService.clonarConfiguracionDesdePais(
      paisDestinoId,
      paisOrigenId,
    );

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.PAIS_CONFIG_EDITAR,
      entidadTipo: AuditEntidadTipo.PAIS,
      entidadId: paisDestinoId,
      valorNuevo: JSON.stringify({ paisOrigenId, ...result }),
    });

    return result;
  }

  async getCapabilities(paisId: number): Promise<PaisCapabilities> {
    await this.findPaisEntityOrFail(paisId);
    return this.paisConfigService.getCapabilities(paisId);
  }

  async findConfiguracionPais(paisId: number): Promise<ConfiguracionPaisItem[]> {
    await this.findPaisEntityOrFail(paisId);
    return this.paisConfigService.findConfiguracion(paisId);
  }

  async updateConfiguracionPais(
    paisId: number,
    clave: string,
    valor: string,
  ): Promise<ConfiguracionPaisItem> {
    await this.findPaisEntityOrFail(paisId);
    return this.paisConfigService.upsertConfiguracion(paisId, clave, valor);
  }

  async findPlantillaTareasPais(paisId: number): Promise<PlantillaTareaItem[]> {
    await this.findPaisEntityOrFail(paisId);
    return this.paisConfigService.findPlantillaTareas(paisId);
  }

  async createPlantillaTareaPais(
    paisId: number,
    data: Parameters<PaisConfigService['createPlantillaTarea']>[1],
  ): Promise<PlantillaTareaItem> {
    await this.findPaisEntityOrFail(paisId);
    return this.paisConfigService.createPlantillaTarea(paisId, data);
  }

  async updatePlantillaTareaPais(
    paisId: number,
    tareaId: number,
    patch: Parameters<PaisConfigService['updatePlantillaTarea']>[2],
  ): Promise<PlantillaTareaItem> {
    await this.findPaisEntityOrFail(paisId);
    return this.paisConfigService.updatePlantillaTarea(paisId, tareaId, patch);
  }

  private async findPaisEntityOrFail(id: number): Promise<Pais> {
    const pais = await this.paisRepository.findOne({ where: { id } });

    if (!pais) {
      throw new BusinessException(
        ErrorCode.PAIS_NO_ENCONTRADO,
        'País no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    return pais;
  }

  private toPaisResponse(
    pais: Pais & {
      ubicacionesCount?: number;
      plantillaTareasCount?: number;
      catalogosActivosCount?: number;
      calificacionPorPuntosHabilitada?: boolean;
      listoOperacion?: boolean;
      advertencias?: string[];
    },
  ): PaisResponseDto {
    return {
      id: pais.id,
      nombre: pais.nombre,
      codigoIso: pais.codigoIso,
      codigoMoneda: pais.codigoMoneda,
      activo: pais.activo,
      ubicacionesCount: pais.ubicacionesCount,
      plantillaTareasCount: pais.plantillaTareasCount,
      catalogosActivosCount: pais.catalogosActivosCount,
      calificacionPorPuntosHabilitada: pais.calificacionPorPuntosHabilitada,
      listoOperacion: pais.listoOperacion,
      advertencias: pais.advertencias,
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
