import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { Rol } from '../src/common/enums/rol.enum';
import { MailService } from '../src/modules/mail/mail.service';
import { configureE2eApp, configureE2eEnvironment } from './e2e-setup';

describe('RBAC y país de sesión (e2e)', () => {
  let app: INestApplication<App>;
  let capturedActivationToken = '';
  const adminDevKey = 'e2e-rbac-admin-key';
  const password = 'Password1';

  async function createUser(
    correo: string,
    rol: Rol,
    paisId?: number,
    adminToken?: string,
  ): Promise<number> {
    const payload: Record<string, unknown> = {
      nombre: 'Usuario E2E',
      correo,
      rol,
    };
    if (paisId !== undefined) {
      payload.paisId = paisId;
    }

    const req = request(app.getHttpServer()).post('/api/v1/users').send(payload);

    if (adminToken) {
      req.set('Authorization', `Bearer ${adminToken}`);
    } else {
      req.set('x-admin-dev-key', adminDevKey);
    }

    const res = await req.expect(201);
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
    const adminCorreo = `admin-rbac-${Date.now()}@test.local`;
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
      .useValue({
        sendActivationEmail: jest.fn(
          async (_to: string, _nombre: string, token: string) => {
            capturedActivationToken = token;
          },
        ),
        sendPasswordResetEmail: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication({ bufferLogs: true });
    configureE2eApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('expone contexto de sesión con país', async () => {
    const visitanteCorreo = `ctx-${Date.now()}@test.local`;
    await createUser(visitanteCorreo, Rol.VISITANTE);
    await activateLastCreatedUser();
    const token = await loginAs(visitanteCorreo);

    await request(app.getHttpServer())
      .get('/api/v1/authorization-demo/context')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.rol).toBe(Rol.VISITANTE);
        expect(res.body.paisSesionId).toBeDefined();
      });
  });

  it('Visitante no puede escribir', async () => {
    const visitanteCorreo = `read-${Date.now()}@test.local`;
    await createUser(visitanteCorreo, Rol.VISITANTE);
    await activateLastCreatedUser();
    const token = await loginAs(visitanteCorreo);

    await request(app.getHttpServer())
      .get('/api/v1/authorization-demo/lectura')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/authorization-demo/escritura')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
      .expect((res) => {
        expect(res.body.errorCode).toBe('PERMISO_DENEGADO');
      });
  });

  it('Operador puede escribir en su país de sesión', async () => {
    const operadorCorreo = `op-${Date.now()}@test.local`;
    await createUser(operadorCorreo, Rol.OPERADOR, 1);
    await activateLastCreatedUser();
    const token = await loginAs(operadorCorreo);

    await request(app.getHttpServer())
      .post('/api/v1/authorization-demo/escritura')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.rol).toBe(Rol.OPERADOR);
        expect(res.body.paisSesionId).toBeDefined();
      });
  });

  it('Validador accede al módulo y ejecuta validación', async () => {
    const validadorCorreo = `val-${Date.now()}@test.local`;
    await createUser(validadorCorreo, Rol.VALIDADOR);
    await activateLastCreatedUser();
    const token = await loginAs(validadorCorreo);

    await request(app.getHttpServer())
      .get('/api/v1/authorization-demo/validacion')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/authorization-demo/validacion')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.message).toBe('Validación ejecutada');
      });
  });

  it('Visitante no accede al módulo de validación', async () => {
    const visitanteCorreo = `noval-${Date.now()}@test.local`;
    await createUser(visitanteCorreo, Rol.VISITANTE);
    await activateLastCreatedUser();
    const token = await loginAs(visitanteCorreo);

    await request(app.getHttpServer())
      .get('/api/v1/authorization-demo/validacion')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('Supervisor ve validación pero no ejecuta', async () => {
    const supervisorCorreo = `sup-${Date.now()}@test.local`;
    await createUser(supervisorCorreo, Rol.SUPERVISOR_SISTEMA);
    await activateLastCreatedUser();
    const token = await loginAs(supervisorCorreo);

    await request(app.getHttpServer())
      .get('/api/v1/authorization-demo/validacion')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/authorization-demo/validacion')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('Administrador puede crear usuarios con JWT sin dev key', async () => {
    const adminToken = await setupAdmin();
    const nuevoCorreo = `jwt-create-${Date.now()}@test.local`;

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: 'Creado por JWT',
        correo: nuevoCorreo,
        rol: Rol.VISITANTE,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.usuario.correo).toBe(nuevoCorreo);
      });
  });
});
