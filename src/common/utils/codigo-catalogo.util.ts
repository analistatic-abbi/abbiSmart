import { CatalogoPaisTipo } from '../enums/catalogo-pais-tipo.enum';
import { generarCodigoTarea } from './codigo-tarea.util';

export function generarCodigoCatalogo(
  etiqueta: string,
  tipo: CatalogoPaisTipo,
): string {
  const texto = etiqueta.trim();

  if (!texto) {
    return 'item';
  }

  if (
    tipo === CatalogoPaisTipo.SEGMENTO_PROCESO ||
    tipo === CatalogoPaisTipo.SEGMENTO_CLIENTE
  ) {
    return texto;
  }

  if (tipo === CatalogoPaisTipo.INDICADOR) {
    return generarCodigoTarea(texto).toUpperCase();
  }

  return generarCodigoTarea(texto);
}
