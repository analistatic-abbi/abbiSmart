import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { CONTACTO_GENERICO_NOMBRE } from '../src/common/constants/crm.constants';
import { ResultadoRelacionamiento } from '../src/common/enums/resultado-relacionamiento.enum';
import { Rol } from '../src/common/enums/rol.enum';
import { SegmentoCliente } from '../src/common/enums/segmento-cliente.enum';
import { MailService } from '../src/modules/mail/mail.service';
import { configureE2eApp, configureE2eEnvironment, createE2eMailServiceMock } from './e2e-setup';

describe('CRM Fase C (e2e)', () => {
  jest.setTimeout(30000);

  let app: INestApplication<App>;
  let capturedActivationToken = '';
  const adminDevKey = 'e2e-crm-admin-key';
  const password = 'Password1';
  let paisSesionId = 1;
  let ubicacionId = 0;

  async function createUser(correo: string, rol: Rol, paisId?: number) {
    const payload: Record<string, unknown> = {
      nombre: 'Usuario CRM E2E',
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
    const adminCorreo = `admin-crm-${Date.now()}@test.local`;
    await createUser(adminCorreo, Rol.ADMINISTRADOR);
    await activateLastCreatedUser();
    return loginAs(adminCorreo);
  }

  async function resolveUbicacionId(token: string): Promise<number> {
    const ubicRes = await request(app.getHttpServer())
      .get('/api/v1/catalogos/ubicaciones')
      .query({ departamento: 'Antioquia', limit: 1, paisId: paisSesionId })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(ubicRes.body.data.length).toBeGreaterThanOrEqual(1);

    return ubicRes.body.data[0].id as number;
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

  it('flujo CRM: cliente, contacto genérico, contacto, relacionamiento', async () => {
    const token = await setupAdminToken();
    ubicacionId = await resolveUbicacionId(token);

    const clienteRes = await request(app.getHttpServer())
      .post('/api/v1/clientes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        empresa: `Empresa CRM ${Date.now()}`,
        ubicacionId,
        segmento: SegmentoCliente.MINERIA,
      })
      .expect(201);

    const clienteId = clienteRes.body.cliente.id as number;

    const contactosRes = await request(app.getHttpServer())
      .get(`/api/v1/clientes/${clienteId}/contactos`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(contactosRes.body.data).toHaveLength(1);
    expect(contactosRes.body.data[0].nombre).toBe(CONTACTO_GENERICO_NOMBRE);
    expect(contactosRes.body.data[0].esGenerico).toBe(true);

    const contactoRes = await request(app.getHttpServer())
      .post(`/api/v1/clientes/${clienteId}/contactos`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'Ana Pérez',
        ubicacionId,
        correo: 'ana@crm.test',
      })
      .expect(201);

    const contactoId = contactoRes.body.contacto.id as number;

    const relacionRes = await request(app.getHttpServer())
      .post('/api/v1/relacionamientos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        contactoId,
        canal: 'Correo',
        mensaje: 'Seguimiento inicial',
        fechaMensaje: '2020-01-01',
        resultado: ResultadoRelacionamiento.NINGUNO,
      })
      .expect(201);

    const relacionamientoId = relacionRes.body.relacionamiento.id as number;

    const vencidosRes = await request(app.getHttpServer())
      .get('/api/v1/relacionamientos/vencidos')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(
      vencidosRes.body.data.some(
        (item: { id: number }) => item.id === relacionamientoId,
      ),
    ).toBe(true);

    await request(app.getHttpServer())
      .patch(`/api/v1/relacionamientos/${relacionamientoId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        respuesta: 'Cliente interesado',
        fechaRespuesta: '2026-03-20',
      })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/v1/contactos/${contactoId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/v1/clientes/${clienteId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('no permite eliminar contacto genérico', async () => {
    const token = await setupAdminToken();
    ubicacionId = await resolveUbicacionId(token);

    const clienteRes = await request(app.getHttpServer())
      .post('/api/v1/clientes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        empresa: `Empresa Genérico ${Date.now()}`,
        ubicacionId,
        segmento: SegmentoCliente.GAS_NATURAL,
      })
      .expect(201);

    const clienteId = clienteRes.body.cliente.id as number;

    const contactosRes = await request(app.getHttpServer())
      .get(`/api/v1/clientes/${clienteId}/contactos`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const genericoId = contactosRes.body.data[0].id as number;

    await request(app.getHttpServer())
      .delete(`/api/v1/contactos/${genericoId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });
});
