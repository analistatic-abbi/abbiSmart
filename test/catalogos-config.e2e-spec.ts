import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { Rol } from '../src/common/enums/rol.enum';
import { MailService } from '../src/modules/mail/mail.service';
import { configureE2eApp, configureE2eEnvironment, createE2eMailServiceMock } from './e2e-setup';

describe('Catálogos y configuración (e2e)', () => {
  let app: INestApplication<App>;
  let capturedActivationToken = '';
  const adminDevKey = 'e2e-catalogos-admin-key';
  const password = 'Password1';
  let paisSesionId = 1;

  async function createUser(
    correo: string,
    rol: Rol,
    paisId?: number,
  ): Promise<number> {
    const payload: Record<string, unknown> = {
      nombre: 'Usuario E2E Catálogos',
      correo,
      rol,
    };

    if (paisId !== undefined) {
      payload.paisId = paisId;
    }

    const res = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('x-admin-dev-key', adminDevKey)
      .send(payload)
      .expect(201);

    return res.body.usuario.id as number;
  }

  async function activateLastCreatedUser(): Promise<void> {
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
      paisSesionId = loginRes.body.paises[0].id as number;

      const countryRes = await request(app.getHttpServer())
        .post('/api/v1/auth/select-country')
        .set('x-pre-auth-token', loginRes.body.preAuthToken)
        .send({ paisId: paisSesionId })
        .expect(200);

      return countryRes.body.accessToken as string;
    }

    return loginRes.body.accessToken as string;
  }

  async function setupAdminToken(): Promise<string> {
    const adminCorreo = `admin-catalogos-${Date.now()}@test.local`;
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

  it('should list countries for authenticated user', async () => {
    const token = await setupAdminToken();

    const res = await request(app.getHttpServer())
      .get('/api/v1/catalogos/paises')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('should read seeded ubicaciones catalog for Colombia', async () => {
    const token = await setupAdminToken();

    const departamentosRes = await request(app.getHttpServer())
      .get('/api/v1/catalogos/ubicaciones/departamentos')
      .query({ paisId: paisSesionId })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(departamentosRes.body.data.length).toBeGreaterThanOrEqual(1);

    const departamento = departamentosRes.body.data[0] as string;

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/catalogos/ubicaciones')
      .query({ departamento, limit: 5 })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listRes.body.total).toBeGreaterThanOrEqual(1);

    const ubicacionId = listRes.body.data[0].id as number;

    await request(app.getHttpServer())
      .get(`/api/v1/catalogos/ubicaciones/${ubicacionId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('should list and update system configuration as admin', async () => {
    const token = await setupAdminToken();

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/configuracion')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listRes.body.data.length).toBeGreaterThanOrEqual(3);

    await request(app.getHttpServer())
      .patch('/api/v1/configuracion/dias_espera_respuesta_crm')
      .set('Authorization', `Bearer ${token}`)
      .send({ valor: '8' })
      .expect(200);

    const detailRes = await request(app.getHttpServer())
      .get('/api/v1/configuracion/dias_espera_respuesta_crm')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(detailRes.body.configuracion.valor).toBe('8');
  });

  it('should deny configuration access to non-admin', async () => {
    const operadorCorreo = `operador-catalogos-${Date.now()}@test.local`;
    await createUser(operadorCorreo, Rol.OPERADOR, paisSesionId);
    await activateLastCreatedUser();
    const token = await loginAs(operadorCorreo);

    await request(app.getHttpServer())
      .get('/api/v1/configuracion')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });
});
