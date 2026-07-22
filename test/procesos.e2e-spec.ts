import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { IndicadorCodigo } from '../src/common/enums/indicador-codigo.enum';
import { ReglaCumplimiento } from '../src/common/enums/regla-cumplimiento.enum';
import { Rol } from '../src/common/enums/rol.enum';
import { SegmentoProceso } from '../src/common/enums/segmento-proceso.enum';
import { TipoInstrumento } from '../src/common/enums/tipo-instrumento.enum';
import { TipoProceso } from '../src/common/enums/tipo-proceso.enum';
import { MailService } from '../src/modules/mail/mail.service';
import { configureE2eApp, configureE2eEnvironment, createE2eMailServiceMock } from './e2e-setup';

describe('Procesos Fase D (e2e)', () => {
  jest.setTimeout(30000);

  let app: INestApplication<App>;
  let capturedActivationToken = '';
  const adminDevKey = 'e2e-procesos-admin-key';
  const password = 'Password1';
  let paisSesionId = 1;
  let ubicacionId = 0;

  async function createUser(correo: string, rol: Rol) {
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('x-admin-dev-key', adminDevKey)
      .send({ nombre: 'Usuario Procesos E2E', correo, rol })
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
    const adminCorreo = `admin-procesos-${Date.now()}@test.local`;
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

    return ubicRes.body.data[0].id as number;
  }

  function buildIndicadoresVacios() {
    return Object.values(IndicadorCodigo).map((indicadorCodigo) => ({
      indicadorCodigo,
      valorRequerido: null,
    }));
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

  it('flujo procesos: parámetro, registro, tareas y dashboard', async () => {
    const token = await setupAdminToken();
    ubicacionId = await resolveUbicacionId(token);

    await request(app.getHttpServer())
      .post('/api/v1/parametros')
      .set('Authorization', `Bearer ${token}`)
      .send({
        indicadorCodigo: IndicadorCodigo.KTNO,
        anio: 2026,
        valor: 1.5,
        reglaCumplimiento: ReglaCumplimiento.MAYOR_O_IGUAL,
      })
      .expect(201);

    const clienteRes = await request(app.getHttpServer())
      .post('/api/v1/clientes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        empresa: `Empresa Proceso ${Date.now()}`,
        ubicacionId,
        segmento: 'Minería',
      })
      .expect(201);

    const clienteId = clienteRes.body.cliente.id as number;

    const procesoRes = await request(app.getHttpServer())
      .post('/api/v1/procesos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        idDigitado: `PROC-${Date.now()}`,
        empresaClienteId: clienteId,
        ubicacionId,
        cuantia: 1000000,
        segmento: SegmentoProceso.GAS_NATURAL,
        tipoProceso: TipoProceso.PERIODICO,
        tipoInstrumento: TipoInstrumento.LICITACION,
        plazoEjecucionMeses: 12,
        experiencia: false,
        fechaApertura: '2026-01-01',
        fechaCierre: '2026-06-30',
        indicadores: buildIndicadoresVacios(),
        confirmarIndicadoresVacios: true,
      })
      .expect(201);

    const procesoId = procesoRes.body.proceso.id as number;
    expect(procesoRes.body.proceso.codigo).toBeTruthy();

    const tareasRes = await request(app.getHttpServer())
      .get(`/api/v1/procesos/${procesoId}/tareas`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(tareasRes.body.data.length).toBe(12);

    const dashboardRes = await request(app.getHttpServer())
      .get('/api/v1/dashboard/procesos')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(
      dashboardRes.body.data.some((item: { id: number }) => item.id === procesoId),
    ).toBe(true);
  });
});
