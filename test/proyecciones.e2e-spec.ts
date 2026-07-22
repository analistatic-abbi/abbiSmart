import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { Rol } from '../src/common/enums/rol.enum';
import { MailService } from '../src/modules/mail/mail.service';
import { configureE2eApp, configureE2eEnvironment, buildE2eUserPayload, createE2eMailServiceMock } from './e2e-setup';

describe('Proyecciones Fase E (e2e)', () => {
  jest.setTimeout(30000);

  let app: INestApplication<App>;
  let capturedActivationToken = '';
  const adminDevKey = 'e2e-proyecciones-admin-key';
  const password = 'Password1';
  let paisSesionId = 1;

  async function createUser(correo: string, rol: Rol) {
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('x-admin-dev-key', adminDevKey)
      .send(buildE2eUserPayload('Usuario Proyecciones E2E', correo, rol))
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
      const colombia = (loginRes.body.paises as Array<{ id: number; nombre: string }>).find(
        (pais) => pais.nombre === 'Colombia',
      );
      paisSesionId = colombia?.id ?? (loginRes.body.paises[0].id as number);

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
    const adminCorreo = `admin-proyecciones-${Date.now()}@test.local`;
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

  it('flujo proyecciones y notificaciones', async () => {
    const token = await setupAdminToken();

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/proyecciones')
      .set('Authorization', `Bearer ${token}`)
      .send({
        anioProyectado: 2027,
        fechaEstimadaPublicacion: '2027-06-15',
        valorVenta: 2500000,
        valorFacturacion: 2000000,
      })
      .expect(201);

    const proyeccionId = Number(createRes.body.proyeccion.id);
    expect(proyeccionId).toBeGreaterThan(0);

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/proyecciones')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listRes.body.total).toBeGreaterThanOrEqual(1);

    await request(app.getHttpServer())
      .get(`/api/v1/proyecciones/${proyeccionId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/proyecciones/${proyeccionId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ valorVenta: 2600000 })
      .expect(200);

    const notifRes = await request(app.getHttpServer())
      .get('/api/v1/notificaciones')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(notifRes.body.data)).toBe(true);

    await request(app.getHttpServer())
      .patch('/api/v1/notificaciones/leer-todas')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .patch('/api/v1/proyecciones/asignar-mercado')
      .set('Authorization', `Bearer ${token}`)
      .send({
        anioProyectado: 2027,
        asignaciones: [{ proyeccionId, mercado: 'General' }],
      })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/proyecciones/${proyeccionId}/cerrar`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.proyeccion.estado).toBe('Cerrado');
      });
  });
});
