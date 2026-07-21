import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/modules/users/users.service';
import { configureE2eApp, configureE2eEnvironment } from './e2e-setup';

describe('Database entities (e2e)', () => {
  let app: INestApplication;
  let usersService: UsersService;

  beforeEach(async () => {
    configureE2eEnvironment();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ bufferLogs: true });
    configureE2eApp(app);
    await app.init();

    usersService = moduleFixture.get(UsersService);
  });

  afterEach(async () => {
    await app.close();
  });

  it('should load TypeORM entities and query paises from MariaDB', async () => {
    const paises = await usersService.findAllPaisesActivos();

    expect(paises.length).toBeGreaterThanOrEqual(2);

    const nombres = paises.map((p) => p.nombre);
    expect(nombres).toContain('Colombia');
    expect(nombres).toContain('Perú');

    for (const pais of paises) {
      expect(pais.activo).toBe(true);
      expect(pais.id).toBeDefined();
    }
  });
});
