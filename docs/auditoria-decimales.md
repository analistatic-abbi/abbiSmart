# Auditoría de representación de decimales (Punto 5)

## Almacenamiento (BD y API)

| Campo | Tipo BD | Formato API |
|-------|---------|-------------|
| `procesos.cuantia` | `decimal(18,2)` | string con punto |
| `proyecciones.valor_venta` / `valor_facturacion` | `decimal(18,2)` | string con punto |
| `parametros_financieros.valor` | `decimal(18,4)` | string con punto |
| `proceso_indicadores.valor_requerido` | `decimal(18,4)` | string con punto |

**Conclusión:** siempre punto decimal en persistencia (estándar SQL/JSON).

## Captura (inputs)

- Inputs `type="number"` con `step` 0.01 o 0.0001.
- Separador dependiente del navegador/teclado; puede confundir coma vs punto en locale ES.
- Indicadores: se añadió `parseDecimalInput()` para aceptar coma al escribir.

## Visualización

| Pantalla | Formato |
|----------|---------|
| Dashboard, calendarios | `formatCurrencyAbbreviated` (`es-CO`, coma) |
| Parámetros admin | `formatParametroValor` (`es-CO`) |
| Detalle proceso, listas varias | valor crudo del API (punto) |

## Colombia vs Perú

- Misma utilidad `es-CO` para COP y PEN; no hay diferenciación por país en formato.

## Recomendación futura (no implementada)

- Pipe/directiva unificada por `paisSesion` para mostrar y capturar.
- No cambiar almacenamiento en BD.
