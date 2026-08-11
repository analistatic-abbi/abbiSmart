import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EstadoProceso } from '../../common/enums/estado-proceso.enum';
import { TipoInstrumento } from '../../common/enums/tipo-instrumento.enum';
import { TipoProceso } from '../../common/enums/tipo-proceso.enum';
import { PermisosService } from '../../common/services/permisos.service';
import { FormatoEncuestaItem } from '../../database/entities/formato-encuesta-item.entity';
import { FormatoEncuestaSeccion } from '../../database/entities/formato-encuesta-seccion.entity';
import { FormatoEncuesta } from '../../database/entities/formato-encuesta.entity';
import { KamEncuestaContacto } from '../../database/entities/kam-encuesta-contacto.entity';
import { KamEncuestaRespuesta } from '../../database/entities/kam-encuesta-respuesta.entity';
import { KamEncuesta } from '../../database/entities/kam-encuesta.entity';
import { KamRondaBitacora } from '../../database/entities/kam-ronda-bitacora.entity';
import { KamRondaCorrespondencia } from '../../database/entities/kam-ronda-correspondencia.entity';
import { KamRonda } from '../../database/entities/kam-ronda.entity';
import { Kam } from '../../database/entities/kam.entity';
import { ProcesoContacto } from '../../database/entities/proceso-contacto.entity';
import { Proceso } from '../../database/entities/proceso.entity';
import { AuditService } from '../audit/audit.service';
import { KamService } from './kam.service';

function repoMock() {
  return {
    find: jest.fn(async () => []),
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 99, fechaCreacion: new Date(), ...value })),
    query: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
    })),
  };
}

describe('KamService', () => {
  let service: KamService;
  let kamRepository: jest.Mocked<Repository<Kam>>;
  let rondaRepository: jest.Mocked<Repository<KamRonda>>;
  let procesoRepository: jest.Mocked<Repository<Proceso>>;
  let auditService: jest.Mocked<Pick<AuditService, 'log'>>;

  const procesoAdjudicado: Proceso = {
    id: 10,
    estado: EstadoProceso.ADJUDICADO,
    empresaClienteId: 2,
    empresaOtro: null,
    paisId: 1,
    eliminado: false,
    tipoProceso: TipoProceso.PERIODICO,
    tipoInstrumento: TipoInstrumento.LICITACION,
  } as Proceso;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KamService,
        { provide: getRepositoryToken(Kam), useValue: repoMock() },
        { provide: getRepositoryToken(KamRonda), useValue: repoMock() },
        { provide: getRepositoryToken(KamRondaCorrespondencia), useValue: repoMock() },
        { provide: getRepositoryToken(KamRondaBitacora), useValue: repoMock() },
        { provide: getRepositoryToken(KamEncuesta), useValue: repoMock() },
        { provide: getRepositoryToken(KamEncuestaContacto), useValue: repoMock() },
        { provide: getRepositoryToken(KamEncuestaRespuesta), useValue: repoMock() },
        { provide: getRepositoryToken(Proceso), useValue: repoMock() },
        { provide: getRepositoryToken(ProcesoContacto), useValue: repoMock() },
        { provide: getRepositoryToken(FormatoEncuesta), useValue: repoMock() },
        { provide: getRepositoryToken(FormatoEncuestaSeccion), useValue: repoMock() },
        { provide: getRepositoryToken(FormatoEncuestaItem), useValue: repoMock() },
        {
          provide: AuditService,
          useValue: { log: jest.fn() },
        },
        {
          provide: PermisosService,
          useValue: { puedeGestionarProcesos: jest.fn(() => true) },
        },
        {
          provide: DataSource,
          useValue: { transaction: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(KamService);
    kamRepository = module.get(getRepositoryToken(Kam));
    rondaRepository = module.get(getRepositoryToken(KamRonda));
    procesoRepository = module.get(getRepositoryToken(Proceso));
    auditService = module.get(AuditService);
  });

  it('should skip KAM creation when proceso has empresaOtro only', async () => {
    procesoRepository.findOne.mockResolvedValue({
      ...procesoAdjudicado,
      empresaClienteId: null,
      empresaOtro: 'Empresa externa',
    } as Proceso);

    await expect(service.generarDesdeProcesoAdjudicado(10, 1)).resolves.toBeNull();
    expect(kamRepository.save).not.toHaveBeenCalled();
  });

  it('should return existing KAM and ensure first ronda exists', async () => {
    procesoRepository.findOne.mockResolvedValue(procesoAdjudicado);
    kamRepository.findOne.mockResolvedValue({
      id: 5,
      procesoId: 10,
      paisId: 1,
      empresaClienteId: 2,
      fechaCreacion: new Date('2026-01-01'),
      creadoPorId: 1,
    } as Kam);
    rondaRepository.findOne.mockResolvedValue({ id: 20, kamId: 5, numero: 1 } as KamRonda);

    const result = await service.generarDesdeProcesoAdjudicado(10, 1);

    expect(result?.id).toBe(5);
    expect(kamRepository.save).not.toHaveBeenCalled();
    expect(rondaRepository.findOne).toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });

  it('should create KAM with first ronda for adjudicated proceso with cliente', async () => {
    procesoRepository.findOne.mockResolvedValue(procesoAdjudicado);
    kamRepository.findOne.mockResolvedValue(null);

    const result = await service.generarDesdeProcesoAdjudicado(10, 7);

    expect(result).toMatchObject({
      id: 99,
      procesoId: 10,
      paisId: 1,
      empresaClienteId: 2,
      creadoPorId: 7,
    });
    expect(kamRepository.save).toHaveBeenCalled();
    expect(rondaRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ kamId: 99, numero: 1 }),
    );
    expect(auditService.log).toHaveBeenCalledTimes(2);
  });
});
