import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuditAccion,
  AuditEntidadTipo,
} from '../../common/enums/audit-accion.enum';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { ConfiguracionSistema } from '../../database/entities/configuracion-sistema.entity';
import { AuditService } from '../audit/audit.service';
import { ConfiguracionService } from './configuracion.service';

describe('ConfiguracionService', () => {
  let service: ConfiguracionService;
  let configRepository: jest.Mocked<Repository<ConfiguracionSistema>>;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfiguracionService,
        {
          provide: getRepositoryToken(ConfiguracionSistema),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
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

    service = module.get(ConfiguracionService);
    configRepository = module.get(getRepositoryToken(ConfiguracionSistema));
    auditService = module.get(AuditService);
  });

  it('should list configuration entries', async () => {
    const fechaModificacion = new Date();
    configRepository.find.mockResolvedValue([
      {
        clave: 'carga_masiva_habilitada',
        valor: 'true',
        descripcion: 'Carga masiva',
        usuarioModificoId: null,
        fechaModificacion,
      } as ConfiguracionSistema,
    ]);

    const result = await service.findAll();

    expect(result).toHaveLength(1);
    expect(result[0].clave).toBe('carga_masiva_habilitada');
  });

  it('should reject invalid boolean configuration value', async () => {
    configRepository.findOne.mockResolvedValue({
      clave: 'carga_masiva_habilitada',
      valor: 'true',
      descripcion: null,
      usuarioModificoId: null,
      fechaModificacion: new Date(),
    } as ConfiguracionSistema);

    await expect(
      service.updateValor(
        'carga_masiva_habilitada',
        { valor: 'yes' },
        1,
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        errorCode: ErrorCode.CONFIGURACION_VALOR_INVALIDO,
      }),
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('should update configuration and audit the change', async () => {
    const item = {
      clave: 'carga_masiva_habilitada',
      valor: 'true',
      descripcion: 'Carga masiva',
      usuarioModificoId: null,
      fechaModificacion: new Date(),
    } as ConfiguracionSistema;

    configRepository.findOne.mockResolvedValue(item);
    configRepository.save.mockImplementation(async (entity) => entity as ConfiguracionSistema);

    const result = await service.updateValor(
      'carga_masiva_habilitada',
      { valor: 'false' },
      5,
    );

    expect(result.valor).toBe('false');
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: AuditAccion.CONFIGURACION_EDITAR,
        entidadTipo: AuditEntidadTipo.CONFIGURACION_SISTEMA,
        campo: 'carga_masiva_habilitada',
        valorAnterior: 'true',
        valorNuevo: 'false',
      }),
    );
  });
});
