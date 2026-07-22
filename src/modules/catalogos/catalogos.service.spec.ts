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
import { Pais } from '../../database/entities/pais.entity';
import { UbicacionGeografica } from '../../database/entities/ubicacion-geografica.entity';
import { AuditService } from '../audit/audit.service';
import { CatalogosService } from './catalogos.service';

describe('CatalogosService', () => {
  let service: CatalogosService;
  let paisRepository: jest.Mocked<Repository<Pais>>;
  let ubicacionRepository: jest.Mocked<Repository<UbicacionGeografica>>;
  let auditService: jest.Mocked<AuditService>;

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
          },
        },
        {
          provide: getRepositoryToken(UbicacionGeografica),
          useValue: {
            findOne: jest.fn(),
            exists: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(CatalogosService);
    paisRepository = module.get(getRepositoryToken(Pais));
    ubicacionRepository = module.get(getRepositoryToken(UbicacionGeografica));
    auditService = module.get(AuditService);
  });

  it('should list countries ordered by name', async () => {
    paisRepository.find.mockResolvedValue([
      { id: 1, nombre: 'Colombia', activo: true } as Pais,
    ]);

    const result = await service.findAllPaises({});

    expect(result).toEqual([{ id: 1, nombre: 'Colombia', activo: true }]);
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
      activo: true,
    } as Pais);
    paisRepository.save.mockResolvedValue({
      id: 3,
      nombre: 'Ecuador',
      activo: true,
    } as Pais);

    const result = await service.createPais(
      { nombre: 'Ecuador' },
      1,
    );

    expect(result).toEqual({ id: 3, nombre: 'Ecuador', activo: true });
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
