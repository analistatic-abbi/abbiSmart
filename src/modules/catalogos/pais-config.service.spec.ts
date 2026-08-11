import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PAIS_CONFIG_CALIFICACION_PUNTOS } from '../../common/constants/pais-config.constants';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ConfiguracionPais } from '../../database/entities/configuracion-pais.entity';
import { PlantillaTareaPais } from '../../database/entities/plantilla-tarea-pais.entity';
import { ConfiguracionService } from '../configuracion/configuracion.service';
import { CatalogoPaisService } from './catalogo-pais.service';
import { PaisConfigService } from './pais-config.service';

describe('PaisConfigService', () => {
  let service: PaisConfigService;
  let configPaisRepository: jest.Mocked<Repository<ConfiguracionPais>>;
  let plantillaRepository: jest.Mocked<Repository<PlantillaTareaPais>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaisConfigService,
        {
          provide: getRepositoryToken(ConfiguracionPais),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            exists: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PlantillaTareaPais),
          useValue: {
            find: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            exists: jest.fn(),
          },
        },
        {
          provide: ConfiguracionService,
          useValue: {
            findByClave: jest.fn(),
          },
        },
        {
          provide: CatalogoPaisService,
          useValue: {
            getEtiquetasGeo: jest.fn().mockResolvedValue({
              nivel1: 'Departamento',
              nivel2: 'Municipio',
            }),
          },
        },
      ],
    }).compile();

    service = module.get(PaisConfigService);
    configPaisRepository = module.get(getRepositoryToken(ConfiguracionPais));
    plantillaRepository = module.get(getRepositoryToken(PlantillaTareaPais));
  });

  it('should enable calificacion por puntos only when config is true', async () => {
    configPaisRepository.findOne.mockResolvedValue({
      paisId: 1,
      clave: PAIS_CONFIG_CALIFICACION_PUNTOS,
      valor: 'true',
    } as ConfiguracionPais);

    await expect(service.habilitaCalificacionPorPuntos(1)).resolves.toBe(true);
  });

  it('should reject calificacion por puntos when disabled for country', async () => {
    configPaisRepository.findOne.mockResolvedValue({
      paisId: 2,
      clave: PAIS_CONFIG_CALIFICACION_PUNTOS,
      valor: 'false',
    } as ConfiguracionPais);

    await expect(service.assertCalificacionPorPuntos(2)).rejects.toBeInstanceOf(
      BusinessException,
    );
  });

  it('should list active plantilla tasks ordered', async () => {
    plantillaRepository.find.mockResolvedValue([
      {
        id: 1,
        paisId: 1,
        codigo: 'Creacion_Carpeta',
        nombre: 'Creación de carpeta',
        orden: 1,
        activo: true,
        aplicaRfi: true,
        requiereFechaAdquisicion: false,
      },
    ] as PlantillaTareaPais[]);

    const result = await service.findPlantillaTareas(1, true);

    expect(result).toHaveLength(1);
    expect(plantillaRepository.find).toHaveBeenCalledWith({
      where: { paisId: 1, activo: true },
      order: { orden: 'ASC', nombre: 'ASC' },
    });
  });

  it('should default margen casi pct to 5 when missing', async () => {
    configPaisRepository.findOne.mockResolvedValue(null);

    await expect(service.getMargenCasiPct(1)).resolves.toBe(5);
  });

  it('should create plantilla task with generated codigo and next orden', async () => {
    plantillaRepository.find.mockResolvedValue([
      { orden: 3 },
    ] as PlantillaTareaPais[]);
    plantillaRepository.exists.mockResolvedValue(false);
    plantillaRepository.create.mockImplementation((data) => data);
    plantillaRepository.save.mockImplementation(async (data) => ({
      id: 10,
      paisId: 1,
      codigo: 'Revision_Legal',
      nombre: 'Revisión legal',
      orden: 4,
      activo: true,
      aplicaRfi: false,
      requiereFechaAdquisicion: false,
      ...data,
    }));

    const result = await service.createPlantillaTarea(1, {
      nombre: 'Revisión legal',
    });

    expect(result.nombre).toBe('Revisión legal');
    expect(result.codigo).toBe('Revision_Legal');
    expect(result.orden).toBe(4);
    expect(plantillaRepository.save).toHaveBeenCalled();
  });
});
