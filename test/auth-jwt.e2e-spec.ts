import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { Rol } from '../src/common/enums/rol.enum';
import { MailService } from '../src/modules/mail/mail.service';
import { configureE2eApp, configureE2eEnvironment, createE2eMailServiceMock } from './e2e-setup';

describe('Auth JWT (e2e)', () => {
  let app: INestApplication<App>;
  let capturedActivationToken: string;
  const adminDevKey = 'e2e-jwt-admin-key';
  const password = 'Password1';

  async function loginAsOperador(): Promise<{
    accessToken: string;
    cookies: string[];
  }> {
    const correo = `jwt-op-${Date.now()}@test.local`;

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('x-admin-dev-key', adminDevKey)
      .send({
        nombre: 'Operador JWT',
        correo,
        rol: Rol.OPERADOR,
        paisId: 1,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({ token: capturedActivationToken, password })
      .expect(200);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ correo, password })
      .expect(200);

    return {
      accessToken: loginRes.body.accessToken as string,
      cookies: loginRes.headers['set-cookie'] ?? [],
    };
  }

  beforeEach(async () => {
    configureE2eEnvironment();
    process.env.ADMIN_DEV_KEY = adminDevKey;

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

  it('POST /auth/refresh renews access token with cookie', async () => {
    const { cookies } = await loginAsOperador();

    const refreshRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookies)
      .expect(200);

    expect(refreshRes.body.accessToken).toBeDefined();
    expect(refreshRes.headers['set-cookie']?.[0]).toContain('abbi_refresh');
  });

  it('POST /auth/logout invalidates session', async () => {
    const { accessToken, cookies } = await loginAsOperador();

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', cookies)
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookies)
      .expect(401);
  });

  it('POST /auth/logout requires access token', async () => {
    await request(app.getHttpServer()).post('/api/v1/auth/logout').expect(401);
  });
});
