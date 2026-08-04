import { BandejaUrgencia } from '../enums/bandeja-urgencia.enum';
import {
  calcularUrgenciaBandeja,
  diasHastaFecha,
} from './bandeja-urgencia.util';

describe('bandeja-urgencia.util', () => {
  it('calcula días hasta una fecha futura', () => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const futuro = new Date(hoy);
    futuro.setDate(futuro.getDate() + 10);

    expect(diasHastaFecha(futuro.toISOString().slice(0, 10))).toBe(10);
  });

  it('clasifica urgencia alta hasta 7 días', () => {
    expect(calcularUrgenciaBandeja(0)).toBe(BandejaUrgencia.ALTA);
    expect(calcularUrgenciaBandeja(7)).toBe(BandejaUrgencia.ALTA);
    expect(calcularUrgenciaBandeja(-2)).toBe(BandejaUrgencia.ALTA);
  });

  it('clasifica urgencia media entre 8 y 30 días', () => {
    expect(calcularUrgenciaBandeja(8)).toBe(BandejaUrgencia.MEDIA);
    expect(calcularUrgenciaBandeja(30)).toBe(BandejaUrgencia.MEDIA);
  });

  it('clasifica urgencia baja después de 30 días', () => {
    expect(calcularUrgenciaBandeja(31)).toBe(BandejaUrgencia.BAJA);
  });

  it('sin fecha queda sin urgencia temporal', () => {
    expect(calcularUrgenciaBandeja(null)).toBe(BandejaUrgencia.SIN_FECHA);
  });
});
