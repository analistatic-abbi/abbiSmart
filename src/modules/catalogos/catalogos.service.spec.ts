import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rol } from '../../common/enums/rol.enum';
import {
  AuditAccion,
  AuditEntidadTipo,
} from '../../common/enums/audit-accion.enum';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { CatalogoPais } from '../../database/entities/catalogo-pais.entity';
import { ConfiguracionPais } from '../../database/entities/configuracion-pais.entity';
import { Pais } from '../../database/entities/pais.entity';
import { PlantillaTareaPais } from '../../database/entities/plantilla-tarea-pais.entity';
import { UbicacionGeografica } from '../../database/entities/ubicacion-geografica.entity';
import { AuditService } from '../audit/audit.service';
import { CatalogoPaisService } from './catalogo-pais.service';
import { CatalogosService } from './catalogos.service';
import { PaisConfigService } from './pais-config.service';
import { PaisOnboardingService } from './pais-onboarding.service';
import { UbicacionesSeederService } from './ubicaciones-seeder.service';

describe('CatalogosService', () => {
  let service: CatalogosService;
  let paisRepository: jest.Mocked<Repository<Pais>>;
  let ubicacionRepository: jest.Mocked<Repository<UbicacionGeografica>>;
  let plantillaRepository: jest.Mocked<Repository<PlantillaTareaPais>>;
  let configPaisRepository: jest.Mocked<Repository<ConfiguracionPais>>;
  let catalogoPaisEntityRepository: jest.Mocked<Repository<CatalogoPais>>;
  let auditService: jest.Mocked<AuditService>;
  let paisOnboardingService: jest.Mocked<PaisOnboardingService>;
  let paisConfigService: jest.Mocked<PaisConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogosService,
        {
          provide: getRepositoryToken(Pais),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            exists: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UbicacionGeografica),
          useValue: {
            findOne: jest.fn(),
            exists: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PlantillaTareaPais),
          useValue: {
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ConfiguracionPais),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CatalogoPais),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn(),
          },
        },
        {
          provide: UbicacionesSeederService,
          useValue: {
            seedForCountry: jest.fn(),
          },
        },
        {
          provide: PaisOnboardingService,
          useValue: {
            onboard: jest.fn(),
          },
        },
        {
          provide: PaisConfigService,
          useValue: {
            habilitaCalificacionPorPuntos: jest.fn(),
            getCapabilities: jest.fn(),
          },
        },
        {
          provide: CatalogoPaisService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get(CatalogosService);
    paisRepository = module.get(getRepositoryToken(Pais));
    ubicacionRepository = module.get(getRepositoryToken(UbicacionGeografica));
    plantillaRepository = module.get(getRepositoryToken(PlantillaTareaPais));
    configPaisRepository = module.get(getRepositoryToken(ConfiguracionPais));
    catalogoPaisEntityRepository = module.get(getRepositoryToken(CatalogoPais));
    auditService = module.get(AuditService);
    paisOnboardingService = module.get(PaisOnboardingService);
    paisConfigService = module.get(PaisConfigService);
  });

  it('should list countries ordered by name', async () => {
    paisRepository.find.mockResolvedValue([
      {
        id: 1,
        nombre: 'Colombia',
        codigoIso: 'CO',
        codigoMoneda: 'COP',
        activo: true,
      } as Pais,
    ]);

    const ubicacionQb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ paisId: '1', total: '1123' }]),
    };

    ubicacionRepository.createQueryBuilder.mockReturnValue(ubicacionQb as never);

    const plantillaQb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ paisId: '1', total: '12' }]),
    };

    plantillaRepository.createQueryBuilder.mockReturnValue(plantillaQb as never);

    const catalogoQb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ paisId: '1', total: '25' }]),
    };
    catalogoPaisEntityRepository.createQueryBuilder.mockReturnValue(catalogoQb as never);

    configPaisRepository.find.mockResolvedValue([
      {
        paisId: 1,
        clave: 'calificacion_por_puntos_habilitada',
        valor: 'true',
      },
    ] as ConfiguracionPais[]);

    const result = await service.findAllPaises({});

    expect(result).toEqual([
      {
        id: 1,
        nombre: 'Colombia',
        codigoIso: 'CO',
        codigoMoneda: 'COP',
        activo: true,
        ubicacionesCount: 1123,
        plantillaTareasCount: 12,
        catalogosActivosCount: 25,
        calificacionPorPuntosHabilitada: true,
        listoOperacion: true,
        advertencias: [],
      },
    ]);
    expect(paisRepository.find).toHaveBeenCalledWith({
      where: {},
      order: { nombre: 'ASC' },
    });
  });

  it('should throw when country does not exist', async () => {
    paisRepository.findOne.mockResolvedValue(null);

    await expect(service.findPaisById(99)).rejects.toMatchObject({
      response: expect.objectContaining({
        errorCode: ErrorCode.PAIS_NO_ENCONTRADO,
      }),
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('should create country and audit the action', async () => {
    paisRepository.exists.mockResolvedValue(false);
    paisRepository.create.mockReturnValue({
      nombre: 'Ecuador',
      codigoIso: 'EC',
      codigoMoneda: 'USD',
      activo: true,
    } as Pais);
    paisRepository.save.mockResolvedValue({
      id: 3,
      nombre: 'Ecuador',
      codigoIso: 'EC',
      codigoMoneda: 'USD',
      activo: true,
    } as Pais);
    paisOnboardingService.onboard.mockResolvedValue({
      ubicaciones: {
        inserted: 115,
        total: 115,
        skipped: false,
      },
      tareasPlantilla: 12,
      configItems: 2,
      catalogosItems: 0,
      parametrosClonados: 5,
    });
    paisConfigService.habilitaCalificacionPorPuntos.mockResolvedValue(false);

    const result = await service.createPais(
      { codigoIso: 'EC' },
      1,
    );

    expect(result).toEqual({
      pais: {
        id: 3,
        nombre: 'Ecuador',
        codigoIso: 'EC',
        codigoMoneda: 'USD',
        activo: true,
        ubicacionesCount: 115,
        calificacionPorPuntosHabilitada: false,
        plantillaTareasCount: 12,
        ubicacionesCount: 115,
      },
      onboarding: {
        ubicaciones: {
          inserted: 115,
          total: 115,
          skipped: false,
        },
        tareasPlantilla: 12,
        configItems: 2,
        catalogosItems: 0,
        parametrosClonados: 5,
      },
    });
    expect(paisOnboardingService.onboard).toHaveBeenCalledWith(3, 'EC', 1);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: AuditAccion.PAIS_CREAR,
        entidadTipo: AuditEntidadTipo.PAIS,
        entidadId: 3,
      }),
    );
  });

  it('should reject ubicaciones from another country for non-admin', async () => {
    await expect(
      service.findUbicaciones({ paisId: 2 }, 1, Rol.OPERADOR),
    ).rejects.toBeInstanceOf(BusinessException);
  });
});
