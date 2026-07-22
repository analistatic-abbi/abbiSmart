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

describe('Carga masiva (e2e)', () => {
  jest.setTimeout(30000);

  let app: INestApplication<App>;
  let capturedActivationToken = '';
  const adminDevKey = 'e2e-carga-masiva-admin-key';
  const password = 'Password1';
  let paisSesionId = 1;
  let paisNombre = 'Colombia';

  async function createUser(correo: string, rol: Rol) {
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('x-admin-dev-key', adminDevKey)
      .send(buildE2eUserPayload('Usuario Carga Masiva E2E', correo, rol))
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
      const colombia = (
        loginRes.body.paises as Array<{ id: number; nombre: string }>
      ).find((pais) => pais.nombre === 'Colombia');

      paisSesionId = colombia?.id ?? (loginRes.body.paises[0].id as number);
      paisNombre = colombia?.nombre ?? loginRes.body.paises[0].nombre;

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
    const adminCorreo = `admin-carga-${Date.now()}@test.local`;
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

  it('catálogo geográfico está disponible para el país de sesión (REG-008)', async () => {
    const token = await setupAdminToken();

    const ubicRes = await request(app.getHttpServer())
      .get('/api/v1/catalogos/ubicaciones')
      .query({ departamento: 'Antioquia', limit: 1, paisId: paisSesionId })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(ubicRes.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('importa clientes desde CSV con columnas legibles (CLI-004)', async () => {
    const token = await setupAdminToken();
    const empresa = `Empresa Carga ${Date.now()}`;
    const csv = [
      'empresa,pais,region,segmento',
      `${empresa},${paisNombre},Antioquia,Minería`,
    ].join('\n');

    const res = await request(app.getHttpServer())
      .post('/api/v1/carga-masiva/clientes')
      .set('Authorization', `Bearer ${token}`)
      .field('content', csv)
      .expect(200);

    expect(res.body.filasExitosas).toBe(1);
    expect(res.body.filasRechazadas).toBe(0);

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/clientes')
      .query({ search: empresa })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(
      listRes.body.data.some(
        (cliente: { empresa: string }) => cliente.empresa === empresa,
      ),
    ).toBe(true);
  });

  it('importa contactos con referido por nombre (CON-003)', async () => {
    const token = await setupAdminToken();
    const empresa = `Empresa Contacto Carga ${Date.now()}`;
    const referente = `Referente ${Date.now()}`;
    const contactoNuevo = `Contacto Importado ${Date.now()}`;

    const clienteCsv = [
      'empresa,pais,region,segmento',
      `${empresa},${paisNombre},Antioquia,Minería`,
    ].join('\n');

    await request(app.getHttpServer())
      .post('/api/v1/carga-masiva/clientes')
      .set('Authorization', `Bearer ${token}`)
      .field('content', clienteCsv)
      .expect(200);

    const contactoReferenteCsv = [
      'empresa,nombre,region,cargo',
      `${empresa},${referente},Antioquia,Gerente`,
    ].join('\n');

    await request(app.getHttpServer())
      .post('/api/v1/carga-masiva/contactos')
      .set('Authorization', `Bearer ${token}`)
      .field('content', contactoReferenteCsv)
      .expect(200);

    const contactoCsv = [
      'empresa,nombre,region,cargo,referido_por_nombre',
      `${empresa},${contactoNuevo},Antioquia,Analista,${referente}`,
    ].join('\n');

    const res = await request(app.getHttpServer())
      .post('/api/v1/carga-masiva/contactos')
      .set('Authorization', `Bearer ${token}`)
      .field('content', contactoCsv)
      .expect(200);

    expect(res.body.filasExitosas).toBe(1);
    expect(res.body.filasRechazadas).toBe(0);

    const contactosRes = await request(app.getHttpServer())
      .get('/api/v1/contactos')
      .query({ search: contactoNuevo })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(contactosRes.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('importa proyecciones desde CSV (PRY-014)', async () => {
    const token = await setupAdminToken();
    const anio = 2030 + (Date.now() % 50);
    const csv = [
      'anio_proyectado,fecha_estimada_publicacion,valor_venta,valor_facturacion',
      `${anio},${anio}-06-15,150000.50,75000.25`,
    ].join('\n');

    const res = await request(app.getHttpServer())
      .post('/api/v1/carga-masiva/proyecciones')
      .set('Authorization', `Bearer ${token}`)
      .field('content', csv)
      .expect(200);

    expect(res.body.filasExitosas).toBe(1);
    expect(res.body.filasRechazadas).toBe(0);

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/proyecciones')
      .query({ anioProyectado: anio })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('rechaza fila de cliente con país distinto a la sesión activa', async () => {
    const token = await setupAdminToken();
    const otroPais = paisNombre === 'Colombia' ? 'Perú' : 'Colombia';
    const csv = [
      'empresa,pais,region,segmento',
      `Empresa Pais Invalido ${Date.now()},${otroPais},Antioquia,Minería`,
    ].join('\n');

    const res = await request(app.getHttpServer())
      .post('/api/v1/carga-masiva/clientes')
      .set('Authorization', `Bearer ${token}`)
      .field('content', csv)
      .expect(200);

    expect(res.body.filasExitosas).toBe(0);
    expect(res.body.filasRechazadas).toBe(1);
  });
});
