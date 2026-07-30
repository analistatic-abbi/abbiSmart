import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { EstadoProceso } from '../src/common/enums/estado-proceso.enum';
import { EstadoProyeccion } from '../src/common/enums/estado-proyeccion.enum';
import { IndicadorCodigo } from '../src/common/enums/indicador-codigo.enum';
import { Rol } from '../src/common/enums/rol.enum';
import { SegmentoProceso } from '../src/common/enums/segmento-proceso.enum';
import { TipoInstrumento } from '../src/common/enums/tipo-instrumento.enum';
import { TipoProceso } from '../src/common/enums/tipo-proceso.enum';
import { MailService } from '../src/modules/mail/mail.service';
import { ScheduledTasksService } from '../src/modules/jobs/scheduled-tasks.service';
import {
  buildE2eUserPayload,
  configureE2eApp,
  configureE2eEnvironment,
  createE2eMailServiceMock,
} from './e2e-setup';

describe('Proyecciones Fase E (e2e)', () => {
  jest.setTimeout(60000);

  let app: INestApplication<App>;
  let capturedActivationToken = '';
  const adminDevKey = 'e2e-proyecciones-admin-key';
  const password = 'Password1';
  let paisSesionId = 1;
  let ubicacionId = 0;

  async function createUser(correo: string, rol: Rol) {
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('x-admin-dev-key', adminDevKey)
      .send(buildE2eUserPayload('Usuario Proyecciones E2E', correo, rol))
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
    const adminCorreo = `admin-proyecciones-${Date.now()}@test.local`;
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

  function fechasProcesoBase() {
    return {
      fechaApertura: '2026-01-01',
      fechaCierre: '2026-06-30',
    };
  }

  async function crearCliente(token: string): Promise<number> {
    const clienteRes = await request(app.getHttpServer())
      .post('/api/v1/clientes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        empresa: `Empresa Proyección ${Date.now()}`,
        ubicacionId,
        segmento: 'Minería',
      })
      .expect(201);

    return clienteRes.body.cliente.id as number;
  }

  async function crearProcesoPeriodico(token: string, clienteId: number): Promise<number> {
    const procesoRes = await request(app.getHttpServer())
      .post('/api/v1/procesos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        idDigitado: `PRY-${Date.now()}`,
        empresaClienteId: clienteId,
        ubicacionId,
        cuantia: 1500000,
        segmento: SegmentoProceso.GAS_NATURAL,
        tipoProceso: TipoProceso.PERIODICO,
        tipoInstrumento: TipoInstrumento.LICITACION,
        plazoEjecucionMeses: 12,
        experiencia: false,
        indicadores: buildIndicadoresVacios(),
        confirmarIndicadoresVacios: true,
        ...fechasProcesoBase(),
      })
      .expect(201);

    return procesoRes.body.proceso.id as number;
  }

  function fechaEnDias(dias: number): string {
    const fecha = new Date();
    fecha.setHours(0, 0, 0, 0);
    fecha.setDate(fecha.getDate() + dias);
    return fecha.toISOString().slice(0, 10);
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

  it('flujo proyecciones CRUD, mercado y cierre', async () => {
    const token = await setupAdminToken();

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/proyecciones')
      .set('Authorization', `Bearer ${token}`)
      .send({
        anioProyectado: 2027,
        fechaEstimadaPublicacion: '2027-06-15',
        valorVenta: 2500000,
        valorFacturacion: 2000000,
      })
      .expect(201);

    const proyeccionId = Number(createRes.body.proyeccion.id);
    expect(proyeccionId).toBeGreaterThan(0);

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/proyecciones')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listRes.body.total).toBeGreaterThanOrEqual(1);

    await request(app.getHttpServer())
      .get(`/api/v1/proyecciones/${proyeccionId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/proyecciones/${proyeccionId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ valorVenta: 2600000 })
      .expect(200);

    await request(app.getHttpServer())
      .patch('/api/v1/proyecciones/asignar-mercado')
      .set('Authorization', `Bearer ${token}`)
      .send({
        anioProyectado: 2027,
        asignaciones: [{ proyeccionId, mercado: 'General' }],
      })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/proyecciones/${proyeccionId}/cerrar`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.proyeccion.estado).toBe(EstadoProyeccion.CERRADO);
      });
  });

  it('rechaza proceso origen duplicado (1:1)', async () => {
    const token = await setupAdminToken();
    ubicacionId = await resolveUbicacionId(token);
    const clienteId = await crearCliente(token);
    const procesoId = await crearProcesoPeriodico(token, clienteId);

    const payload = {
      anioProyectado: 2028,
      fechaEstimadaPublicacion: '2028-03-01',
      valorVenta: 100000,
      valorFacturacion: 80000,
      procesoOrigenId: procesoId,
    };

    await request(app.getHttpServer())
      .post('/api/v1/proyecciones')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/proyecciones')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(409)
      .expect((res) => {
        expect(res.body.errorCode).toBe('PROYECCION_ORIGEN_DUPLICADA');
      });
  });

  it('genera proyección al adjudicar proceso periódico y notifica in-app', async () => {
    const token = await setupAdminToken();
    ubicacionId = await resolveUbicacionId(token);
    const clienteId = await crearCliente(token);
    const procesoId = await crearProcesoPeriodico(token, clienteId);

    const dataSource = app.get(DataSource);
    await dataSource.query(`UPDATE procesos SET estado = ? WHERE id = ?`, [
      EstadoProceso.PRESENTADO,
      procesoId,
    ]);

    await request(app.getHttpServer())
      .patch(`/api/v1/procesos/${procesoId}/estado`)
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: EstadoProceso.ADJUDICADO })
      .expect(200)
      .expect((res) => {
        expect(res.body.proceso.estado).toBe(EstadoProceso.ADJUDICADO);
      });

    const proyeccionRows = await dataSource.query(
      `SELECT id FROM proyecciones WHERE proceso_origen_id = ? AND eliminado = FALSE`,
      [procesoId],
    );
    expect(proyeccionRows.length).toBeGreaterThan(0);
    const proyeccionId = Number(proyeccionRows[0].id);

    const detailRes = await request(app.getHttpServer())
      .get(`/api/v1/proyecciones/${proyeccionId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Number(detailRes.body.proyeccion.procesoOrigenId)).toBe(Number(procesoId));

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/proyecciones')
      .set('Authorization', `Bearer ${token}`)
      .query({ limit: 100 })
      .expect(200);

    const generada = listRes.body.data.find(
      (item: { id: number; procesoOrigenId: number | null }) =>
        Number(item.id) === proyeccionId,
    );
    expect(generada).toBeTruthy();
    expect(Number(generada.procesoOrigenId)).toBe(Number(procesoId));

    const notifRes = await request(app.getHttpServer())
      .get('/api/v1/notificaciones')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(
      notifRes.body.data.some(
        (n: { tipo: string; entidadId: number | string }) =>
          n.tipo === 'proyeccion_creada_auto' &&
          Number(n.entidadId) === proyeccionId,
      ),
    ).toBe(true);
  });

  it('vincula proceso resultante y publica la proyección', async () => {
    const token = await setupAdminToken();
    ubicacionId = await resolveUbicacionId(token);
    const clienteId = await crearCliente(token);

    const proyeccionRes = await request(app.getHttpServer())
      .post('/api/v1/proyecciones')
      .set('Authorization', `Bearer ${token}`)
      .send({
        anioProyectado: 2029,
        fechaEstimadaPublicacion: '2029-04-10',
        valorVenta: 500000,
        valorFacturacion: 400000,
      })
      .expect(201);

    const proyeccionId = proyeccionRes.body.proyeccion.id as number;
    const procesoResultanteId = await crearProcesoPeriodico(token, clienteId);

    await request(app.getHttpServer())
      .patch(`/api/v1/proyecciones/${proyeccionId}/vincular-proceso`)
      .set('Authorization', `Bearer ${token}`)
      .send({ procesoResultanteId })
      .expect(200)
      .expect((res) => {
        expect(res.body.proyeccion.estado).toBe(EstadoProyeccion.PUBLICADO);
        expect(Number(res.body.proyeccion.procesoResultanteId)).toBe(
          Number(procesoResultanteId),
        );
      });

    const otraProyeccionRes = await request(app.getHttpServer())
      .post('/api/v1/proyecciones')
      .set('Authorization', `Bearer ${token}`)
      .send({
        anioProyectado: 2030,
        fechaEstimadaPublicacion: '2030-05-01',
        valorVenta: 300000,
        valorFacturacion: 250000,
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/proyecciones/${otraProyeccionRes.body.proyeccion.id}/vincular-proceso`)
      .set('Authorization', `Bearer ${token}`)
      .send({ procesoResultanteId })
      .expect(409)
      .expect((res) => {
        expect(res.body.errorCode).toBe('PROYECCION_RESULTANTE_DUPLICADA');
      });
  });

  it('cron de estados notifica transición Lejano → Proximo', async () => {
    const token = await setupAdminToken();
    const fechaProxima = fechaEnDias(60);

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/proyecciones')
      .set('Authorization', `Bearer ${token}`)
      .send({
        anioProyectado: new Date(fechaProxima).getFullYear(),
        fechaEstimadaPublicacion: fechaProxima,
        valorVenta: 900000,
        valorFacturacion: 700000,
      })
      .expect(201);

    const proyeccionId = createRes.body.proyeccion.id as number;
    const dataSource = app.get(DataSource);
    await dataSource.query(`UPDATE proyecciones SET estado = ? WHERE id = ?`, [
      EstadoProyeccion.LEJANO,
      proyeccionId,
    ]);

    const scheduledTasks = app.get(ScheduledTasksService);
    const result = await scheduledTasks.runProyeccionEstadoJob();
    expect(result.estadosActualizados).toBeGreaterThanOrEqual(1);

    const detailRes = await request(app.getHttpServer())
      .get(`/api/v1/proyecciones/${proyeccionId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(detailRes.body.proyeccion.estado).toBe(EstadoProyeccion.PROXIMO);

    const notifRes = await request(app.getHttpServer())
      .get('/api/v1/notificaciones')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(
      notifRes.body.data.some(
        (n: { tipo: string; entidadId: number | string }) =>
          n.tipo === 'proyeccion_proxima' &&
          Number(n.entidadId) === Number(proyeccionId),
      ),
    ).toBe(true);
  });

  it('reporta efectividad de mercado por año proyectado', async () => {
    const token = await setupAdminToken();
    const anioReporte = 9000 + (Date.now() % 1000);

    const antesRes = await request(app.getHttpServer())
      .get('/api/v1/proyecciones/efectividad-mercado')
      .query({ anio: anioReporte })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const generalRes = await request(app.getHttpServer())
      .post('/api/v1/proyecciones')
      .set('Authorization', `Bearer ${token}`)
      .send({
        anioProyectado: anioReporte,
        fechaEstimadaPublicacion: `${anioReporte}-06-15`,
        valorVenta: 1000000,
        valorFacturacion: 800000,
      })
      .expect(201);

    const objetivoRes = await request(app.getHttpServer())
      .post('/api/v1/proyecciones')
      .set('Authorization', `Bearer ${token}`)
      .send({
        anioProyectado: anioReporte,
        fechaEstimadaPublicacion: `${anioReporte}-08-01`,
        valorVenta: 1200000,
        valorFacturacion: 900000,
      })
      .expect(201);

    const generalId = Number(generalRes.body.proyeccion.id);
    const objetivoId = Number(objetivoRes.body.proyeccion.id);

    await request(app.getHttpServer())
      .patch('/api/v1/proyecciones/asignar-mercado')
      .set('Authorization', `Bearer ${token}`)
      .send({
        anioProyectado: anioReporte,
        asignaciones: [
          { proyeccionId: generalId, mercado: 'General' },
          { proyeccionId: objetivoId, mercado: 'Objetivo' },
        ],
      })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/proyecciones/${generalId}/cerrar`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const reporteRes = await request(app.getHttpServer())
      .get('/api/v1/proyecciones/efectividad-mercado')
      .query({ anio: anioReporte })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(reporteRes.body.data.anio).toBe(anioReporte);
    expect(reporteRes.body.data.general.total).toBe(
      antesRes.body.data.general.total + 1,
    );
    expect(reporteRes.body.data.general.nuncaMaterializadas).toBe(
      antesRes.body.data.general.nuncaMaterializadas + 1,
    );
    expect(reporteRes.body.data.general.pendientes).toBe(
      antesRes.body.data.general.pendientes,
    );
    expect(reporteRes.body.data.general.pctNuncaMaterializadas).toBe(100);
    expect(reporteRes.body.data.objetivo.total).toBe(
      antesRes.body.data.objetivo.total + 1,
    );
    expect(reporteRes.body.data.objetivo.pendientes).toBe(
      antesRes.body.data.objetivo.pendientes + 1,
    );
    expect(reporteRes.body.data.objetivo.pctGanadas).toBeNull();
  });
});
