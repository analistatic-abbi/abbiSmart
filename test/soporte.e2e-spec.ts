import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { Rol } from '../src/common/enums/rol.enum';
import { MailService } from '../src/modules/mail/mail.service';
import { MondayService } from '../src/modules/monday/monday.service';
import {
  buildE2eUserPayload,
  configureE2eApp,
  configureE2eEnvironment,
  createE2eMailServiceMock,
} from './e2e-setup';

describe('Soporte (e2e)', () => {
  jest.setTimeout(60000);

  let app: INestApplication<App>;
  let capturedActivationToken = '';
  let supportTicketPayload: Record<string, unknown> | null = null;
  const adminDevKey = 'e2e-soporte-admin-key';
  const password = 'Password1';

  async function createUser(correo: string, rol: Rol): Promise<void> {
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('x-admin-dev-key', adminDevKey)
      .send(buildE2eUserPayload('Usuario Soporte E2E', correo, rol))
      .expect(201);
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

  beforeEach(async () => {
    configureE2eEnvironment();
    process.env.ADMIN_DEV_KEY = adminDevKey;
    capturedActivationToken = '';
    supportTicketPayload = null;

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
      .overrideProvider(MondayService)
      .useValue({
        isConfigured: () => true,
        createSupportTicket: jest.fn(async (input: Record<string, unknown>) => {
          supportTicketPayload = input;
          return { itemId: 'e2e-monday-item' };
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication({ bufferLogs: true });
    configureE2eApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /soporte/mensaje requires authentication', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/soporte/mensaje')
      .send({ mensaje: 'Mensaje de prueba para soporte' })
      .expect(401);
  });

  it('POST /soporte/mensaje creates Monday support ticket', async () => {
    const correo = `soporte-${Date.now()}@test.local`;
    await createUser(correo, Rol.VISITANTE);
    await activateUser();
    const token = await loginAs(correo);

    await request(app.getHttpServer())
      .post('/api/v1/soporte/mensaje')
      .set('Authorization', `Bearer ${token}`)
      .send({
        categoria: 'Acceso y cuenta',
        asunto: 'Consulta E2E',
        mensaje: 'Necesito ayuda con el acceso al sistema de prueba.',
        paginaActual: '/dashboard',
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.message).toContain('registrada');
      });

    expect(supportTicketPayload).not.toBeNull();
    expect(supportTicketPayload?.correo).toBe(correo);
    expect(supportTicketPayload?.tipoSolicitud).toBe('Acceso y cuenta');
    expect(String(supportTicketPayload?.descripcion)).toContain('Consulta E2E');
    expect(String(supportTicketPayload?.descripcion)).toContain('acceso al sistema');
    expect(String(supportTicketPayload?.descripcion)).toContain('/dashboard');
    expect(supportTicketPayload?.sede).toBeTruthy();
  });
});
