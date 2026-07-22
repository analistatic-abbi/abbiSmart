import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuditAccion } from '../src/common/enums/audit-accion.enum';
import { Rol } from '../src/common/enums/rol.enum';
import { MailService } from '../src/modules/mail/mail.service';
import { configureE2eApp, configureE2eEnvironment, buildE2eUserPayload, createE2eMailServiceMock } from './e2e-setup';

describe('Auditoría (e2e)', () => {
  jest.setTimeout(30000);

  let app: INestApplication<App>;
  let capturedActivationToken = '';
  const adminDevKey = 'e2e-audit-admin-key';
  const password = 'Password1';

  async function createUser(correo: string, rol: Rol): Promise<number> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('x-admin-dev-key', adminDevKey)
      .send(buildE2eUserPayload('Usuario Audit', correo, rol))
      .expect(201);

    return res.body.usuario.id as number;
  }

  async function activateUser(): Promise<void> {
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

  async function setupAdmin(): Promise<string> {
    const adminCorreo = `audit-admin-${Date.now()}@test.local`;
    await createUser(adminCorreo, Rol.ADMINISTRADOR);
    await activateUser();
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

    app = moduleFixture.createNestApplication({ bufferLogs: true });
    configureE2eApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('registra activación y login en log_auditoria', async () => {
    const adminToken = await setupAdmin();

    const auditRes = await request(app.getHttpServer())
      .get('/api/v1/audit')
      .query({ accion: AuditAccion.ACTIVACION })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(auditRes.body.total).toBeGreaterThanOrEqual(1);
    expect(auditRes.body.data[0].accion).toBe(AuditAccion.ACTIVACION);

    const loginAudit = await request(app.getHttpServer())
      .get('/api/v1/audit')
      .query({ accion: AuditAccion.LOGIN })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(loginAudit.body.total).toBeGreaterThanOrEqual(1);
  });

  it('registra login fallido', async () => {
    const adminToken = await setupAdmin();
    const targetCorreo = `fail-${Date.now()}@test.local`;
    await createUser(targetCorreo, Rol.VISITANTE);
    await activateUser();

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ correo: targetCorreo, password: 'WrongPass1' })
      .expect(401);

    const auditRes = await request(app.getHttpServer())
      .get('/api/v1/audit')
      .query({ accion: AuditAccion.LOGIN_FALLIDO })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(auditRes.body.total).toBeGreaterThanOrEqual(1);
  });

  it('solo administrador consulta auditoría', async () => {
    const visitanteCorreo = `audit-visit-${Date.now()}@test.local`;
    await createUser(visitanteCorreo, Rol.VISITANTE);
    await activateUser();
    const visitanteToken = await loginAs(visitanteCorreo);

    await request(app.getHttpServer())
      .get('/api/v1/audit')
      .set('Authorization', `Bearer ${visitanteToken}`)
      .expect(403);
  });

  it('registra logout', async () => {
    const adminCorreo = `logout-audit-${Date.now()}@test.local`;
    await createUser(adminCorreo, Rol.ADMINISTRADOR);
    await activateUser();
    const adminToken = await loginAs(adminCorreo);

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const newToken = await loginAs(adminCorreo);

    const auditRes = await request(app.getHttpServer())
      .get('/api/v1/audit')
      .query({ accion: AuditAccion.LOGOUT })
      .set('Authorization', `Bearer ${newToken}`)
      .expect(200);

    expect(auditRes.body.total).toBeGreaterThanOrEqual(1);
  });
});
