import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BandejaUrgencia } from '../../common/enums/bandeja-urgencia.enum';
import { FijacionEntidadTipo } from '../../common/enums/fijacion-entidad-tipo.enum';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { Proceso } from '../../database/entities/proceso.entity';
import { Proyeccion } from '../../database/entities/proyeccion.entity';
import { Relacionamiento } from '../../database/entities/relacionamiento.entity';
import { UsuarioFijacion } from '../../database/entities/usuario-fijacion.entity';
import { BandejaPersonalService } from './bandeja-personal.service';

describe('BandejaPersonalService', () => {
  let service: BandejaPersonalService;
  let fijacionRepository: jest.Mocked<Repository<UsuarioFijacion>>;
  let procesoRepository: jest.Mocked<Repository<Proceso>>;
  let proyeccionRepository: jest.Mocked<Repository<Proyeccion>>;
  let relacionamientoRepository: jest.Mocked<Repository<Relacionamiento>>;
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    dataSource = { query: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BandejaPersonalService,
        {
          provide: getRepositoryToken(UsuarioFijacion),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            exists: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Proceso),
          useValue: {
            exists: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Proyeccion),
          useValue: {
            exists: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Relacionamiento),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get(BandejaPersonalService);
    fijacionRepository = module.get(getRepositoryToken(UsuarioFijacion));
    procesoRepository = module.get(getRepositoryToken(Proceso));
    proyeccionRepository = module.get(getRepositoryToken(Proyeccion));
    relacionamientoRepository = module.get(getRepositoryToken(Relacionamiento));
  });

  it('fijar es idempotente cuando ya existe la fijación', async () => {
    procesoRepository.exists.mockResolvedValue(true);
    fijacionRepository.findOne.mockResolvedValue({
      id: 1,
      usuarioId: 10,
      entidadTipo: FijacionEntidadTipo.PROCESO,
      entidadId: 5,
      fechaFijacion: new Date(),
    } as UsuarioFijacion);

    await service.fijar(10, 1, {
      entidadTipo: FijacionEntidadTipo.PROCESO,
      entidadId: 5,
    });

    expect(fijacionRepository.save).not.toHaveBeenCalled();
  });

  it('fijar crea registro cuando la entidad es accesible', async () => {
    procesoRepository.exists.mockResolvedValue(true);
    fijacionRepository.findOne.mockResolvedValue(null);
    fijacionRepository.create.mockReturnValue({
      usuarioId: 10,
      entidadTipo: FijacionEntidadTipo.PROCESO,
      entidadId: 5,
    } as UsuarioFijacion);
    fijacionRepository.save.mockResolvedValue({} as UsuarioFijacion);

    await service.fijar(10, 1, {
      entidadTipo: FijacionEntidadTipo.PROCESO,
      entidadId: 5,
    });

    expect(fijacionRepository.create).toHaveBeenCalledWith({
      usuarioId: 10,
      entidadTipo: FijacionEntidadTipo.PROCESO,
      entidadId: 5,
    });
    expect(fijacionRepository.save).toHaveBeenCalled();
  });

  it('fijar rechaza entidad inaccesible', async () => {
    procesoRepository.exists.mockResolvedValue(false);

    await expect(
      service.fijar(10, 1, {
        entidadTipo: FijacionEntidadTipo.PROCESO,
        entidadId: 99,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        errorCode: ErrorCode.RECURSO_NO_ENCONTRADO,
      }),
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('getEstado indica si la entidad está fijada', async () => {
    fijacionRepository.exists.mockResolvedValue(true);

    await expect(
      service.getEstado(10, FijacionEntidadTipo.PROYECCION, 3),
    ).resolves.toEqual({ fijado: true });
  });

  it('getBandeja omite entidades inaccesibles y calcula resumen', async () => {
    const fecha = new Date('2026-01-15T10:00:00.000Z');
    fijacionRepository.find.mockResolvedValue([
      {
        id: 1,
        usuarioId: 10,
        entidadTipo: FijacionEntidadTipo.PROCESO,
        entidadId: 5,
        fechaFijacion: fecha,
      } as UsuarioFijacion,
      {
        id: 2,
        usuarioId: 10,
        entidadTipo: FijacionEntidadTipo.PROYECCION,
        entidadId: 8,
        fechaFijacion: fecha,
      } as UsuarioFijacion,
    ]);

    const procesoQb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    procesoRepository.createQueryBuilder.mockReturnValue(procesoQb as never);
    dataSource.query.mockResolvedValue([]);

    const result = await service.getBandeja(10, 1);

    expect(result.procesos).toEqual([]);
    expect(result.proyecciones).toEqual([]);
    expect(result.relacionamientos).toEqual([]);
    expect(result.resumen.totalFijados).toBe(0);
  });

  it('getBandeja ordena procesos por urgencia', async () => {
    const fecha = new Date('2026-01-15T10:00:00.000Z');
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const cierreUrgente = new Date(hoy);
    cierreUrgente.setDate(cierreUrgente.getDate() + 3);
    const cierreLejano = new Date(hoy);
    cierreLejano.setDate(cierreLejano.getDate() + 60);

    fijacionRepository.find.mockResolvedValue([
      {
        id: 1,
        usuarioId: 10,
        entidadTipo: FijacionEntidadTipo.PROCESO,
        entidadId: 2,
        fechaFijacion: fecha,
      } as UsuarioFijacion,
      {
        id: 2,
        usuarioId: 10,
        entidadTipo: FijacionEntidadTipo.PROCESO,
        entidadId: 1,
        fechaFijacion: fecha,
      } as UsuarioFijacion,
    ]);

    const procesos = new Map<number, Proceso>([
      [
        1,
        {
          id: 1,
          codigo: 'P-URG',
          idDigitado: 'P-URG',
          fechaCierre: cierreUrgente.toISOString().slice(0, 10),
          estado: 'Activo',
          empresaCliente: { empresa: 'A' },
        } as Proceso,
      ],
      [
        2,
        {
          id: 2,
          codigo: 'P-LEJ',
          idDigitado: 'P-LEJ',
          fechaCierre: cierreLejano.toISOString().slice(0, 10),
          estado: 'Activo',
          empresaCliente: { empresa: 'B' },
        } as Proceso,
      ],
    ]);

    procesoRepository.createQueryBuilder.mockImplementation(() => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockImplementation(async () => {
          const calls = qb.where.mock.calls;
          const entidadId = Number(calls[0]?.[1]?.entidadId);
          return procesos.get(entidadId) ?? null;
        }),
      };
      return qb as never;
    });

    const result = await service.getBandeja(10, 1);

    expect(result.procesos.map((item) => item.id)).toEqual([1, 2]);
    expect(result.procesos[0]?.urgencia).toBe(BandejaUrgencia.ALTA);
    expect(result.procesos[1]?.urgencia).toBe(BandejaUrgencia.BAJA);
    expect(result.resumen.urgentes).toBe(1);
  });
});
