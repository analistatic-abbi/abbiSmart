import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EstadoProceso } from '../../common/enums/estado-proceso.enum';
import { EstadoProyeccion } from '../../common/enums/estado-proyeccion.enum';
import { MetaAnual } from '../../database/entities/meta-anual.entity';
import { Pais } from '../../database/entities/pais.entity';
import { Proceso } from '../../database/entities/proceso.entity';
import { Proyeccion } from '../../database/entities/proyeccion.entity';
import { ReporteGenerado } from '../../database/entities/reporte-generado.entity';
import { PermisosService } from '../../common/services/permisos.service';
import { AuditService } from '../audit/audit.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { ProyeccionesService } from '../proyecciones/proyecciones.service';
import { DashboardService, porcentajeVsMeta } from './dashboard.service';

describe('DashboardService — analítica', () => {
  let service: DashboardService;
  let procesoQuery: jest.Mock;
  let proyeccionQuery: jest.Mock;
  let metaFindOne: jest.Mock;
  let metaSave: jest.Mock;
  let metaCreate: jest.Mock;
  let metaMerge: jest.Mock;
  let auditLog: jest.Mock;

  beforeEach(async () => {
    procesoQuery = jest.fn(async (sql: string) => {
      if (sql.includes('COUNT(*) AS total') && sql.includes('GROUP BY p.estado')) {
        return [
          { estado: EstadoProceso.EN_PROCESO, total: '4' },
          { estado: EstadoProceso.EN_VALIDACION, total: '2' },
          { estado: EstadoProceso.PRESENTADO, total: '1' },
          { estado: EstadoProceso.SUBSANACION, total: '1' },
          { estado: EstadoProceso.ADJUDICADO, total: '2' },
        ];
      }

      if (sql.includes('procesosActivos')) {
        return [
          {
            procesosActivos: 8,
            cierresProximos30Dias: 3,
            validacionesPendientes: 2,
            relacionamientosVencidos: 4,
            clientesActivos: 9,
            contactosActivos: 15,
            relacionamientosTotal: 12,
            reunionesProgramadas: 3,
          },
        ];
      }

      if (sql.includes('ventana0_30') && sql.includes('fecha_cierre')) {
        return [{ ventana0_30: '3', ventana31_60: '2', ventana61_90: '1' }];
      }

      if (sql.includes('GROUP BY r.canal') || sql.includes('GROUP BY r.resultado')) {
        return [{ etiqueta: 'Correo', total: '5' }];
      }

      if (sql.includes('GROUP BY cl.segmento')) {
        return [{ etiqueta: 'Gas Natural', total: '4' }];
      }

      if (sql.includes('conRespuesta')) {
        return [{ conRespuesta: '6', pendientes: '3', vencidos: '4' }];
      }

      if (sql.includes('ventana0_30') && sql.includes('fecha_mensaje')) {
        return [{ ventana0_30: '5', ventana31_60: '2', ventana61_90: '1' }];
      }

      if (sql.includes('GROUP BY p.segmento')) {
        return [{ segmento: 'Gas', total: '5' }];
      }

      if (sql.includes('real_adjudicacion')) {
        return [
          {
            real_adjudicacion: '1000',
            real_facturacion: '200',
            proyectada_adjudicacion: '1500',
            proyectada_facturacion: '400',
          },
        ];
      }

      if (sql.includes('COUNT(*) AS total') && sql.includes('FROM procesos p')) {
        return [{ total: 12 }];
      }

      return [];
    });

    proyeccionQuery = jest.fn(async (sql: string) => {
      if (sql.includes('GROUP BY estado, mercado')) {
        return [
          { estado: EstadoProyeccion.LEJANO, mercado: 'General', total: '2' },
          { estado: EstadoProyeccion.LEJANO, mercado: 'Objetivo', total: '1' },
          { estado: EstadoProyeccion.PROXIMO, mercado: 'General', total: '3' },
        ];
      }

      if (sql.includes('GROUP BY mercado')) {
        return [{ mercado: 'General', total: '4', sumaVenta: '600', sumaFacturacion: '500' }];
      }

      if (sql.includes('GROUP BY estado')) {
        return [
          {
            estado: EstadoProyeccion.LEJANO,
            total: '2',
            sumaVenta: '400',
            sumaFacturacion: '300',
          },
        ];
      }

      if (sql.includes('COUNT(*) AS total')) {
        return [{ total: 6, sumaVenta: '1000', sumaFacturacion: '800' }];
      }

      return [];
    });

    metaFindOne = jest.fn().mockResolvedValue({
      id: 9,
      paisId: 1,
      anio: 2026,
      metaAdjudicacion: '2000.00',
      metaFacturacion: '1000.00',
    });
    metaSave = jest.fn(async (row) => ({ id: row.id ?? 11, ...row }));
    metaCreate = jest.fn((row) => row);
    metaMerge = jest.fn((_target, source) => ({ id: 9, ...source }));
    auditLog = jest.fn().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: getRepositoryToken(Proceso),
          useValue: { query: procesoQuery },
        },
        {
          provide: getRepositoryToken(Proyeccion),
          useValue: { query: proyeccionQuery },
        },
        {
          provide: getRepositoryToken(ReporteGenerado),
          useValue: { find: jest.fn(), findOne: jest.fn(), save: jest.fn(), create: jest.fn() },
        },
        {
          provide: getRepositoryToken(Pais),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(MetaAnual),
          useValue: {
            findOne: metaFindOne,
            save: metaSave,
            create: metaCreate,
            merge: metaMerge,
          },
        },
        {
          provide: NotificacionesService,
          useValue: { crear: jest.fn() },
        },
        {
          provide: PermisosService,
          useValue: {},
        },
        {
          provide: AuditService,
          useValue: { log: auditLog },
        },
        {
          provide: ProyeccionesService,
          useValue: {
            getEfectividadMercado: jest.fn().mockResolvedValue({
              anio: 2026,
              sinMercado: 0,
              inconsistencias: 0,
              general: {
                total: 10,
                pendientes: 2,
                resueltas: 8,
                nuncaMaterializadas: 1,
                materializadasNoGanadas: 3,
                ganadas: 4,
                materializadas: 7,
                pctNuncaMaterializadas: 12.5,
                pctMaterializadasNoGanadas: 37.5,
                pctGanadas: 50,
                pctGanadasDeMaterializadas: 57.14,
              },
              objetivo: {
                total: 5,
                pendientes: 1,
                resueltas: 4,
                nuncaMaterializadas: 0,
                materializadasNoGanadas: 1,
                ganadas: 3,
                materializadas: 4,
                pctNuncaMaterializadas: 0,
                pctMaterializadasNoGanadas: 25,
                pctGanadas: 75,
                pctGanadasDeMaterializadas: 75,
              },
            }),
          },
        },
      ],
    }).compile();

    service = module.get(DashboardService);
  });

  it('getAnalitica agrega KPIs, embudo y ventanas de cierre', async () => {
    const result = await service.getAnalitica(1, 2026);

    expect(result.anio).toBe(2026);
    expect(result.kpis).toEqual({
      procesosActivos: 8,
      proyeccionesActivas: 6,
      cierresProximos30Dias: 3,
      validacionesPendientes: 2,
      relacionamientosVencidos: 4,
      clientesActivos: 9,
      contactosActivos: 15,
      relacionamientosTotal: 12,
      reunionesProgramadas: 3,
    });

    expect(result.embudo).toEqual([
      { etapa: 'Proyecciones activas', clave: 'proyecciones_activas', total: 6 },
      { etapa: 'En proceso', clave: 'en_proceso', total: 4 },
      { etapa: 'En validación', clave: 'en_validacion', total: 2 },
      { etapa: 'Presentado / Subsanación', clave: 'presentado_subsanacion', total: 2 },
      { etapa: 'Adjudicado', clave: 'adjudicado', total: 2 },
    ]);

    expect(result.cierresPorVentana).toEqual([
      { ventana: '0_30', label: '0–30 días', total: 3 },
      { ventana: '31_60', label: '31–60 días', total: 2 },
      { ventana: '61_90', label: '61–90 días', total: 1 },
    ]);

    expect(result.proyeccionesPorEstadoMercado).toEqual([
      { estado: EstadoProyeccion.LEJANO, general: 2, objetivo: 1 },
      { estado: EstadoProyeccion.PROXIMO, general: 3, objetivo: 0 },
      { estado: EstadoProyeccion.SALE_ESTE_MES, general: 0, objetivo: 0 },
    ]);

    expect(result.efectividadMercado.general.pctGanadasDeMaterializadas).toBe(57.14);
    expect(result.crm.porCanal).toEqual([{ etiqueta: 'Correo', total: 5 }]);
    expect(result.crm.porResultado).toEqual([{ etiqueta: 'Correo', total: 5 }]);

    expect(result.gauges).toEqual({
      metaAdjudicacion: '2000.00',
      metaFacturacion: '1000.00',
      real: { adjudicacion: '1000.00', facturacion: '200.00' },
      proyectada: { adjudicacion: '1500.00', facturacion: '400.00' },
    });
    expect(porcentajeVsMeta(result.gauges.real.adjudicacion, result.gauges.metaAdjudicacion)).toBe(
      50,
    );
    expect(
      porcentajeVsMeta(result.gauges.proyectada.facturacion, result.gauges.metaFacturacion),
    ).toBe(40);
  });

  it('getAnalitica no finge meta en 0 cuando no hay registro', async () => {
    metaFindOne.mockResolvedValueOnce(null);

    const result = await service.getAnalitica(1, 2026);

    expect(result.gauges.metaAdjudicacion).toBeNull();
    expect(result.gauges.metaFacturacion).toBeNull();
    expect(porcentajeVsMeta(result.gauges.real.adjudicacion, result.gauges.metaAdjudicacion)).toBeNull();
  });

  it('porcentajeVsMeta puede superar 100 y queda nulo sin meta', () => {
    expect(porcentajeVsMeta('1500', '1000')).toBe(150);
    expect(porcentajeVsMeta(0, null)).toBeNull();
    expect(porcentajeVsMeta('100', '0')).toBeNull();
  });

  it('upsertMetas crea o actualiza las metas del país y año', async () => {
    metaFindOne.mockResolvedValueOnce(null);

    const created = await service.upsertMetas(
      1,
      { anio: 2026, metaAdjudicacion: 2500, metaFacturacion: 900 },
      7,
    );

    expect(metaCreate).toHaveBeenCalled();
    expect(metaSave).toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalled();
    expect(created).toEqual({
      anio: 2026,
      metaAdjudicacion: '2500.00',
      metaFacturacion: '900.00',
    });

    const updated = await service.upsertMetas(
      1,
      { anio: 2026, metaAdjudicacion: 3000.5, metaFacturacion: 1100 },
      7,
    );

    expect(metaMerge).toHaveBeenCalled();
    expect(updated.metaAdjudicacion).toBe('3000.50');
  });
});
