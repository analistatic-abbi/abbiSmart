import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { Rol } from '../src/common/enums/rol.enum';
import { MailService } from '../src/modules/mail/mail.service';
import { configureE2eApp, configureE2eEnvironment, buildE2eUserPayload, createE2eMailServiceMock } from './e2e-setup';

describe('Dashboard (e2e)', () => {
  jest.setTimeout(30000);

  let app: INestApplication<App>;
  let capturedActivationToken = '';
  const adminDevKey = 'e2e-dashboard-admin-key';
  const password = 'Password1';

  async function createUser(correo: string, rol: Rol) {
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('x-admin-dev-key', adminDevKey)
      .send(buildE2eUserPayload('Usuario Dashboard E2E', correo, rol))
      .expect(201);
  }

  async function activateLastCreatedUser() {
    await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({ token: capturedActivationToken, password })
      .expect(200);
  }

  async function loginAs(correo: string): Promise<string> {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ correo, password })
      .expect(200);

    if (loginRes.body.requiresCountrySelection) {
      const countryRes = await request(app.getHttpServer())
        .post('/api/v1/auth/select-country')
        .set('x-pre-auth-token', loginRes.body.preAuthToken)
        .send({ paisId: loginRes.body.paises[0].id })
        .expect(200);

      return countryRes.body.accessToken as string;
    }

    return loginRes.body.accessToken as string;
  }

  async function setupAdminToken(): Promise<string> {
    const adminCorreo = `admin-dashboard-${Date.now()}@test.local`;
    await createUser(adminCorreo, Rol.ADMINISTRADOR);
    await activateLastCreatedUser();
    return loginAs(adminCorreo);
  }

  beforeEach(async () => {
    configureE2eEnvironment();
    process.env.ADMIN_DEV_KEY = adminDevKey;
    capturedActivationToken = '';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue(
        createE2eMailServiceMock({
          onActivationToken: (token) => {
            capturedActivationToken = token;
          },
        }),
      )
      .compile();

    app = moduleFixture.createNestApplication();
    configureE2eApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('expone métricas de proyecciones (PRY-010)', async () => {
    const token = await setupAdminToken();

    await request(app.getHttpServer())
      .get('/api/v1/dashboard/proyecciones')
      .query({ anio: 2027 })
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.data.anio).toBe(2027);
        expect(res.body.data.totalProyeccionesActivas).toBeGreaterThanOrEqual(0);
        expect(res.body.data.sumaValorVenta).toBeDefined();
      });
  });

  it('expone campos SGP en listado de procesos (REV-001)', async () => {
    const token = await setupAdminToken();

    await request(app.getHttpServer())
      .get('/api/v1/dashboard/procesos')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        if (res.body.data.length > 0) {
          const item = res.body.data[0];
          expect(item).toHaveProperty('diasEspera');
          expect(item).toHaveProperty('fechaEsperada');
          expect(item).toHaveProperty('mesesEjecucionAnioReporte');
        }
      });
  });
});
