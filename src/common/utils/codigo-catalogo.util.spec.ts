import { CatalogoPaisTipo } from '../enums/catalogo-pais-tipo.enum';
import { generarCodigoCatalogo } from './codigo-catalogo.util';

describe('generarCodigoCatalogo', () => {
  it('should keep segment labels as codigo', () => {
    expect(
      generarCodigoCatalogo('Servicios Petroleros', CatalogoPaisTipo.SEGMENTO_CLIENTE),
    ).toBe('Servicios Petroleros');
  });

  it('should uppercase indicator codes', () => {
    expect(
      generarCodigoCatalogo('Índice de liquidez', CatalogoPaisTipo.INDICADOR),
    ).toBe('INDICE_DE_LIQUIDEZ');
  });
});
