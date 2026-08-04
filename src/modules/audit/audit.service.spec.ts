import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditAccion, AuditEntidadTipo } from '../../common/enums/audit-accion.enum';
import { LogAuditoria } from '../../database/entities/log-auditoria.entity';
import { Pais } from '../../database/entities/pais.entity';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  let service: AuditService;
  let logRepository: jest.Mocked<Repository<LogAuditoria>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(LogAuditoria),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findAndCount: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Pais),
          useValue: {
            find: jest.fn().mockResolvedValue([
              { id: 1, nombre: 'Colombia' },
              { id: 2, nombre: 'Perú' },
            ]),
          },
        },
      ],
    }).compile();

    service = module.get(AuditService);
    logRepository = module.get(getRepositoryToken(LogAuditoria));
  });

  it('should persist audit log entry', async () => {
    const entry = {
      usuarioId: 1,
      accion: AuditAccion.LOGIN,
      entidadTipo: AuditEntidadTipo.AUTH,
      entidadId: 1,
      campo: null,
      valorAnterior: null,
      valorNuevo: null,
    };

    logRepository.create.mockReturnValue(entry as LogAuditoria);
    logRepository.save.mockResolvedValue({ id: 10, ...entry, fechaHora: new Date() } as LogAuditoria);

    await service.log({
      usuarioId: 1,
      accion: AuditAccion.LOGIN,
      entidadTipo: AuditEntidadTipo.AUTH,
      entidadId: 1,
    });

    expect(logRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: AuditAccion.LOGIN,
        entidadTipo: AuditEntidadTipo.AUTH,
      }),
    );
    expect(logRepository.save).toHaveBeenCalled();
  });

  it('should return paginated audit logs', async () => {
    const fechaHora = new Date();
    logRepository.findAndCount.mockResolvedValue([
      [
        {
          id: 1,
          usuarioId: 2,
          accion: AuditAccion.LOGIN,
          entidadTipo: AuditEntidadTipo.AUTH,
          entidadId: 2,
          campo: null,
          valorAnterior: null,
          valorNuevo: null,
          fechaHora,
        } as LogAuditoria,
      ],
      1,
    ]);

    const result = await service.findAll({ page: 1, limit: 10 });

    expect(result.total).toBe(1);
    expect(result.data[0].accion).toBe(AuditAccion.LOGIN);
  });

  it('should filter audit logs by specific day', async () => {
    logRepository.findAndCount.mockResolvedValue([[], 0]);

    await service.findAll({ fecha: '2026-07-27', page: 1, limit: 10 });

    const call = logRepository.findAndCount.mock.calls[0][0] as {
      where: { fechaHora: { _value: [Date, Date] } };
    };
    const [desde, hasta] = call.where.fechaHora._value;

    expect(desde).toEqual(new Date('2026-07-27T00:00:00'));
    expect(hasta).toEqual(new Date('2026-07-27T23:59:59'));
  });
});
