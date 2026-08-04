import { IndicadorCodigo } from '../enums/indicador-codigo.enum';
import {
  findRangoParaValor,
  parseCeldaNumerica,
  validarRangosPorIndicador,
  valorEnRango,
} from './formato-rango.util';

describe('formato-rango.util', () => {
  const ktnoFilas = [
    { excelRow: 2, indicadorCodigo: IndicadorCodigo.KTNO, rangoMin: null, rangoMax: 2.915, puntos: 0 },
    { excelRow: 3, indicadorCodigo: IndicadorCodigo.KTNO, rangoMin: 2.915, rangoMax: 3.2, puntos: 5 },
    { excelRow: 4, indicadorCodigo: IndicadorCodigo.KTNO, rangoMin: 3.2, rangoMax: 4.198, puntos: 10 },
    { excelRow: 5, indicadorCodigo: IndicadorCodigo.KTNO, rangoMin: 4.198, rangoMax: null, puntos: 15 },
  ];

  it('parsea celdas numéricas con coma decimal', () => {
    expect(parseCeldaNumerica('4,198')).toBe(4.198);
    expect(parseCeldaNumerica('')).toBeNull();
  });

  it('aplica convención de límites', () => {
    expect(valorEnRango(2.5, null, 2.915)).toBe(true);
    expect(valorEnRango(2.915, 2.915, 3.2)).toBe(true);
    expect(valorEnRango(3.2, 2.915, 3.2)).toBe(false);
    expect(valorEnRango(4.198, 4.198, null)).toBe(true);
  });

  it('valida 4 rangos continuos sin huecos ni solapamientos', () => {
    const { errores, rangosValidados } = validarRangosPorIndicador(
      IndicadorCodigo.KTNO,
      ktnoFilas,
    );
    expect(errores).toEqual([]);
    expect(rangosValidados).toHaveLength(4);
  });

  it('rechaza hueco entre rangos', () => {
    const filas = [
      ...ktnoFilas.slice(0, 2),
      { ...ktnoFilas[2]!, rangoMin: 3.5 },
      ktnoFilas[3]!,
    ];
    const { errores } = validarRangosPorIndicador(IndicadorCodigo.KTNO, filas);
    expect(errores.some((e) => e.includes('hueco'))).toBe(true);
  });

  it('rechaza solapamiento entre rangos', () => {
    const filas = [
      ...ktnoFilas.slice(0, 2),
      { ...ktnoFilas[2]!, rangoMin: 3.0 },
      ktnoFilas[3]!,
    ];
    const { errores } = validarRangosPorIndicador(IndicadorCodigo.KTNO, filas);
    expect(errores.some((e) => e.includes('solapamiento'))).toBe(true);
  });

  it('encuentra exactamente un rango para un valor', () => {
    const rangos = ktnoFilas.map((fila, index) => ({
      orden: index + 1,
      rangoMin: fila.rangoMin,
      rangoMax: fila.rangoMax,
      puntos: fila.puntos,
    }));
    const match = findRangoParaValor(rangos, 3.5);
    expect(match?.puntos).toBe(10);
  });
});
