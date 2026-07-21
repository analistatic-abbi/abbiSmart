import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { Rol } from '../src/common/enums/rol.enum';
import { MailService } from '../src/modules/mail/mail.service';
import { configureE2eApp, configureE2eEnvironment } from './e2e-setup';

describe('Auth login (e2e)', () => {
  let app: INestApplication<App>;
  let capturedActivationToken: string;
  const adminDevKey = 'e2e-login-admin-key';
  const password = 'Password1';

  async function createActiveUser(
    correo: string,
    rol: Rol,
    paisId?: number,
  ): Promise<void> {
    const payload: Record<string, unknown> = {
      nombre: 'Usuario Login E2E',
      correo,
      rol,
    };
    if (paisId !== undefined) {
      payload.paisId = paisId;
    }

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('x-admin-dev-key', adminDevKey)
      .send(payload)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({ token: capturedActivationToken, password })
      .expect(200);
  }

  beforeEach(async () => {
    configureE2eEnvironment();
    process.env.ADMIN_DEV_KEY = adminDevKey;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue({
        sendActivationEmail: jest.fn(
          async (_to: string, _nombre: string, token: string) => {
            capturedActivationToken = token;
          },
        ),
      })
      .compile();

    app = moduleFixture.createNestApplication({ bufferLogs: true });
    configureE2eApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('login → select-country creates session for Visitante', async () => {
    const correo = `visitante-${Date.now()}@test.local`;
    await createActiveUser(correo, Rol.VISITANTE);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ correo, password })
      .expect(200);

    expect(loginRes.body.requiresCountrySelection).toBe(true);
    expect(loginRes.body.preAuthToken).toBeDefined();
    expect(loginRes.body.paises.length).toBeGreaterThanOrEqual(1);

    const paisId = loginRes.body.paises[0].id;

    await request(app.getHttpServer())
      .post('/api/v1/auth/select-country')
      .set('x-pre-auth-token', loginRes.body.preAuthToken)
      .send({ paisId })
      .expect(200)
      .expect((res) => {
        expect(res.body.accessToken).toBeDefined();
        expect(res.body.session.id).toBeDefined();
        expect(Number(res.body.session.paisSesionId)).toBe(Number(paisId));
        expect(res.headers['set-cookie']?.[0]).toContain('abbi_refresh');
      });
  });

  it('login creates session directly for Operador', async () => {
    const correo = `operador-${Date.now()}@test.local`;
    await createActiveUser(correo, Rol.OPERADOR, 1);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ correo, password })
      .expect(200)
      .expect((res) => {
        expect(res.body.requiresCountrySelection).toBe(false);
        expect(res.body.accessToken).toBeDefined();
        expect(Number(res.body.session.paisSesionId)).toBe(1);
        expect(res.headers['set-cookie']?.[0]).toContain('abbi_refresh');
      });
  });

  it('blocks account after repeated failed logins', async () => {
    const correo = `lockout-${Date.now()}@test.local`;
    await createActiveUser(correo, Rol.VISITANTE);

    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ correo, password: 'WrongPass1' })
        .expect(401);
    }

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ correo, password })
      .expect(403)
      .expect((res) => {
        expect(res.body.errorCode).toBe('AUTH_CUENTA_BLOQUEADA');
      });
  });
});
