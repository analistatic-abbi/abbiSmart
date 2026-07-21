import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { Rol } from '../src/common/enums/rol.enum';
import { MailService } from '../src/modules/mail/mail.service';
import { configureE2eApp, configureE2eEnvironment } from './e2e-setup';

describe('Auth activation (e2e)', () => {
  let app: INestApplication<App>;
  let capturedToken: string;
  const adminDevKey = 'e2e-test-admin-key';

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
            capturedToken = token;
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

  it('POST /users → POST /auth/activate completes activation flow', async () => {
    const correo = `e2e-${Date.now()}@test.local`;

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('x-admin-dev-key', adminDevKey)
      .send({
        nombre: 'Usuario E2E',
        correo,
        rol: Rol.VISITANTE,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.usuario.estado).toBe('Inactivo');
        expect(res.body.usuario.correo).toBe(correo);
      });

    expect(capturedToken).toBeDefined();
    expect(capturedToken).toHaveLength(64);

    await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({
        token: capturedToken,
        password: 'Password1',
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.usuario.estado).toBe('Activo');
        expect(res.body.usuario.correo).toBe(correo);
      });

    await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({
        token: capturedToken,
        password: 'Password1',
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.errorCode).toBe('TOKEN_ACTIVACION_USADO');
      });
  });

  it('POST /users rejects requests without admin dev key', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({
        nombre: 'Sin Key',
        correo: `nokey-${Date.now()}@test.local`,
        rol: Rol.VISITANTE,
      })
      .expect(403);
  });
});
