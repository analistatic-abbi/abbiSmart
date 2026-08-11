import { formatMonedaAbreviada, tituloMonedaCompleta } from './currency.util';

describe('currency.util', () => {
  it('abrevia millones sin redondear de más', () => {
    expect(formatMonedaAbreviada(800_000_000)).toContain('800');
    expect(formatMonedaAbreviada(800_000_000)).toContain('mill');
  });

  it('expone valor completo en tooltip', () => {
    expect(tituloMonedaCompleta(800_000_000)).toContain('800');
  });
});
