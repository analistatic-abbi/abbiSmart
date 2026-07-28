import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { Rol } from '../src/common/enums/rol.enum';
import { MailService } from '../src/modules/mail/mail.service';
import {
  buildE2eUserPayload,
  configureE2eApp,
  configureE2eEnvironment,
  createE2eMailServiceMock,
} from './e2e-setup';

describe('Auth forgot-password (e2e)', () => {
  jest.setTimeout(60000);

  let app: INestApplication<App>;
  let capturedActivationToken = '';
  let capturedResetToken = '';
  const adminDevKey = 'e2e-forgot-admin-key';
  const password = 'Password1';
  const genericMessage =
    'Si el correo está registrado, recibirá instrucciones en breve.';

  async function createUser(correo: string, rol: Rol): Promise<void> {
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('x-admin-dev-key', adminDevKey)
      .send(buildE2eUserPayload('Usuario Forgot E2E', correo, rol))
      .expect(201);
  }

  async function activateUser(): Promise<void> {
    await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({ token: capturedActivationToken, password })
      .expect(200);
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

  it('POST /auth/forgot-password sends reset email for active users', async () => {
    const correo = `forgot-active-${Date.now()}@test.local`;
    await createUser(correo, Rol.VISITANTE);
    await activateUser();

    await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ correo })
      .expect(200)
      .expect((res) => {
        expect(res.body.message).toBe(genericMessage);
      });

    expect(capturedResetToken).toHaveLength(64);
  });

  it('POST /auth/forgot-password sends activation email for inactive users', async () => {
    const correo = `forgot-inactive-${Date.now()}@test.local`;
    await createUser(correo, Rol.VISITANTE);

    const firstToken = capturedActivationToken;
    expect(firstToken).toHaveLength(64);

    await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ correo })
      .expect(200)
      .expect((res) => {
        expect(res.body.message).toBe(genericMessage);
      });

    expect(capturedActivationToken).toHaveLength(64);
    expect(capturedResetToken).toBe('');
  });

  it('POST /auth/forgot-password does not send email for blocked users', async () => {
    const correo = `forgot-blocked-${Date.now()}@test.local`;
    await createUser(correo, Rol.VISITANTE);
    await activateUser();

    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ correo, password: 'WrongPass1' })
        .expect(401);
    }

    capturedResetToken = '';

    await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ correo })
      .expect(200)
      .expect((res) => {
        expect(res.body.message).toBe(genericMessage);
      });

    expect(capturedResetToken).toBe('');
  });

  it('POST /auth/forgot-password returns generic message for unknown email', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ correo: `unknown-${Date.now()}@test.local` })
      .expect(200)
      .expect((res) => {
        expect(res.body.message).toBe(genericMessage);
      });

    expect(capturedResetToken).toBe('');
    expect(capturedActivationToken).toBe('');
  });
});
