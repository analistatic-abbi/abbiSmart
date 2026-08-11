import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogoPaisTipo } from '../../common/enums/catalogo-pais-tipo.enum';
import { CatalogoPais } from '../../database/entities/catalogo-pais.entity';
import { Cliente } from '../../database/entities/cliente.entity';
import { Proceso } from '../../database/entities/proceso.entity';
import { Proyeccion } from '../../database/entities/proyeccion.entity';
import { CatalogoPaisService } from './catalogo-pais.service';

describe('CatalogoPaisService', () => {
  let service: CatalogoPaisService;
  let catalogoRepository: jest.Mocked<Repository<CatalogoPais>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogoPaisService,
        {
          provide: getRepositoryToken(CatalogoPais),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            exists: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Proceso),
          useValue: { exists: jest.fn() },
        },
        {
          provide: getRepositoryToken(Cliente),
          useValue: { exists: jest.fn() },
        },
        {
          provide: getRepositoryToken(Proyeccion),
          useValue: { exists: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(CatalogoPaisService);
    catalogoRepository = module.get(getRepositoryToken(CatalogoPais));
  });

  it('returns geo labels with defaults', async () => {
    catalogoRepository.findOne
      .mockResolvedValueOnce({
        etiqueta: 'Departamento',
      } as CatalogoPais)
      .mockResolvedValueOnce({
        etiqueta: 'Municipio',
      } as CatalogoPais);

    await expect(service.getEtiquetasGeo(1)).resolves.toEqual({
      nivel1: 'Departamento',
      nivel2: 'Municipio',
    });
  });

  it('lists active catalog items by type', async () => {
    catalogoRepository.find.mockResolvedValue([
      {
        id: 1,
        paisId: 1,
        tipo: CatalogoPaisTipo.SEGMENTO_PROCESO,
        codigo: 'Gas Natural',
        etiqueta: 'Gas Natural',
        orden: 1,
        activo: true,
      },
    ] as CatalogoPais[]);

    const items = await service.findByTipo(1, CatalogoPaisTipo.SEGMENTO_PROCESO, true);

    expect(items).toHaveLength(1);
    expect(catalogoRepository.find).toHaveBeenCalledWith({
      where: { paisId: 1, tipo: CatalogoPaisTipo.SEGMENTO_PROCESO, activo: true },
      order: { orden: 'ASC', etiqueta: 'ASC' },
    });
  });
});
