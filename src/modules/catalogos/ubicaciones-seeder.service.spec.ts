import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UbicacionGeografica } from '../../database/entities/ubicacion-geografica.entity';
import { UbicacionesSeederService } from './ubicaciones-seeder.service';

describe('UbicacionesSeederService', () => {
  let service: UbicacionesSeederService;
  let ubicacionRepository: jest.Mocked<Repository<UbicacionGeografica>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UbicacionesSeederService,
        {
          provide: getRepositoryToken(UbicacionGeografica),
          useValue: {
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(UbicacionesSeederService);
    ubicacionRepository = module.get(getRepositoryToken(UbicacionGeografica));
  });

  it('should build rows for Ecuador', () => {
    const rows = service.buildRows('EC');

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((row) => row.departamento === 'Pichincha')).toBe(true);
    expect(
      rows.some(
        (row) =>
          row.departamento === 'Pichincha' &&
          row.municipioProvincia.toLowerCase().includes('quito'),
      ),
    ).toBe(true);
  });

  it('should map Bogotá D.C. under Cundinamarca for Colombia', () => {
    const rows = service.buildRows('CO');

    expect(rows.some((row) => row.departamento === 'Bogotá D.C.')).toBe(false);
    expect(rows).toContainEqual({
      departamento: 'Cundinamarca',
      municipioProvincia: 'Bogotá',
    });
  });

  it('should skip seeding when ubicaciones already exist', async () => {
    ubicacionRepository.count.mockResolvedValue(120);

    const result = await service.seedForCountry(3, 'EC');

    expect(result).toEqual({ inserted: 0, total: 120, skipped: true });
    expect(ubicacionRepository.createQueryBuilder).not.toHaveBeenCalled();
  });
});
