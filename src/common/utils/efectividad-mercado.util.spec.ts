import { EstadoProceso } from '../enums/estado-proceso.enum';
import { EstadoProyeccion } from '../enums/estado-proyeccion.enum';
import {
  calcularMetricasMercado,
  clasificarDesenlaceProyeccion,
  conteosDesdeDesenlaces,
} from './efectividad-mercado.util';

describe('efectividad-mercado.util', () => {
  describe('clasificarDesenlaceProyeccion', () => {
    it('clasifica ganada cuando el proceso resultante fue adjudicado', () => {
      expect(
        clasificarDesenlaceProyeccion({
          estado: EstadoProyeccion.PUBLICADO,
          procesoResultanteId: 10,
          fueAdjudicado: true,
        }),
      ).toBe('ganada');
    });

    it('clasifica materializada no ganada cuando hay proceso sin adjudicación', () => {
      expect(
        clasificarDesenlaceProyeccion({
          estado: EstadoProyeccion.PUBLICADO,
          procesoResultanteId: 10,
          procesoEstado: EstadoProceso.PRESENTADO,
          fueAdjudicado: false,
        }),
      ).toBe('materializada_no_ganada');
    });

    it('clasifica nunca materializada cuando está cerrada sin proceso', () => {
      expect(
        clasificarDesenlaceProyeccion({
          estado: EstadoProyeccion.CERRADO,
          procesoResultanteId: null,
        }),
      ).toBe('nunca_materializada');
    });

    it('clasifica pendiente para proyección abierta sin proceso', () => {
      expect(
        clasificarDesenlaceProyeccion({
          estado: EstadoProyeccion.LEJANO,
          procesoResultanteId: null,
        }),
      ).toBe('pendiente');
    });

    it('clasifica pendiente cuando el proceso resultante fue eliminado', () => {
      expect(
        clasificarDesenlaceProyeccion({
          estado: EstadoProyeccion.PUBLICADO,
          procesoResultanteId: 10,
          procesoEliminado: true,
        }),
      ).toBe('pendiente');
    });
  });

  describe('calcularMetricasMercado', () => {
    it('calcula porcentajes sobre resueltas y materializadas', () => {
      const metricas = calcularMetricasMercado({
        nuncaMaterializadas: 2,
        materializadasNoGanadas: 3,
        ganadas: 1,
        pendientes: 4,
      });

      expect(metricas.total).toBe(10);
      expect(metricas.resueltas).toBe(6);
      expect(metricas.materializadas).toBe(4);
      expect(metricas.pctNuncaMaterializadas).toBe(33.3);
      expect(metricas.pctMaterializadasNoGanadas).toBe(50);
      expect(metricas.pctGanadas).toBe(16.7);
      expect(metricas.pctGanadasDeMaterializadas).toBe(25);
    });

    it('devuelve null en porcentajes cuando no hay base de cálculo', () => {
      const metricas = calcularMetricasMercado({
        nuncaMaterializadas: 0,
        materializadasNoGanadas: 0,
        ganadas: 0,
        pendientes: 3,
      });

      expect(metricas.pctNuncaMaterializadas).toBeNull();
      expect(metricas.pctGanadasDeMaterializadas).toBeNull();
    });
  });

  describe('conteosDesdeDesenlaces', () => {
    it('agrupa desenlaces en conteos', () => {
      expect(
        conteosDesdeDesenlaces([
          'ganada',
          'materializada_no_ganada',
          'nunca_materializada',
          'pendiente',
        ]),
      ).toEqual({
        ganadas: 1,
        materializadasNoGanadas: 1,
        nuncaMaterializadas: 1,
        pendientes: 1,
      });
    });
  });
});
