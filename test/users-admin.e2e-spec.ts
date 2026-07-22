import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { Rol } from '../src/common/enums/rol.enum';
import { MailService } from '../src/modules/mail/mail.service';
import { configureE2eApp, configureE2eEnvironment, createE2eMailServiceMock } from './e2e-setup';

describe('Users admin (e2e)', () => {
  jest.setTimeout(30000);

  let app: INestApplication<App>;
  let capturedActivationToken = '';
  let capturedResetToken = '';
  const adminDevKey = 'e2e-admin-users-key';
  const password = 'Password1';

  async function createUser(
    correo: string,
    rol: Rol,
    paisId?: number,
  ): Promise<number> {
    const payload: Record<string, unknown> = {
      nombre: 'Usuario E2E',
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
    const adminCorreo = `admin-${Date.now()}@test.local`;
    await createUser(adminCorreo, Rol.ADMINISTRADOR);
    await activateLastCreatedUser();
    return loginAs(adminCorreo);
  }

  beforeEach(async () => {
    configureE2eEnvironment();
    process.env.ADMIN_DEV_KEY = adminDevKey;
    capturedActivationToken = '';
    capturedResetToken = '';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue(
        createE2eMailServiceMock({
          onActivationToken: (token) => {
            capturedActivationToken = token;
          },
          onResetToken: (token) => {
            capturedResetToken = token;
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

  it('admin can unlock a blocked user', async () => {
    const adminToken = await setupAdmin();
    const targetCorreo = `blocked-${Date.now()}@test.local`;
    const targetId = await createUser(targetCorreo, Rol.VISITANTE);
    await activateLastCreatedUser();

    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ correo: targetCorreo, password: 'WrongPass1' })
        .expect(401);
    }

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ correo: targetCorreo, password })
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/v1/users/${targetId}/unlock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.usuario.estado).toBe('Activo');
      });

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ correo: targetCorreo, password })
      .expect(200);
  });

  it('admin can trigger password reset and user sets new password', async () => {
    const adminToken = await setupAdmin();
    const targetCorreo = `reset-${Date.now()}@test.local`;
    const targetId = await createUser(targetCorreo, Rol.VISITANTE);
    await activateLastCreatedUser();

    await request(app.getHttpServer())
      .post(`/api/v1/users/${targetId}/reset-password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(capturedResetToken).toHaveLength(64);

    const newPassword = 'NewPassword2';
    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token: capturedResetToken, password: newPassword })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ correo: targetCorreo, password: newPassword })
      .expect(200);
  });

  it('admin can update user role', async () => {
    const adminToken = await setupAdmin();
    const targetCorreo = `patch-${Date.now()}@test.local`;
    const targetId = await createUser(targetCorreo, Rol.VISITANTE);
    await activateLastCreatedUser();

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${targetId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rol: Rol.VALIDADOR })
      .expect(200)
      .expect((res) => {
        expect(res.body.usuario.rol).toBe(Rol.VALIDADOR);
      });
  });

  it('non-admin cannot access admin endpoints', async () => {
    const visitanteCorreo = `visitante-${Date.now()}@test.local`;
    const targetId = await createUser(visitanteCorreo, Rol.VISITANTE);
    await activateLastCreatedUser();
    const visitanteToken = await loginAs(visitanteCorreo);

    await request(app.getHttpServer())
      .post(`/api/v1/users/${targetId}/unlock`)
      .set('Authorization', `Bearer ${visitanteToken}`)
      .expect(403);
  });
});
