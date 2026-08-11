-- Corrige catálogos con encoding corrupto (??) y elimina duplicados cuando ya existe la versión correcta.
SET NAMES utf8mb4;

-- Reasignar referencias de negocio antes de borrar duplicados
UPDATE clientes SET segmento = 'Acabados de Construcción' WHERE segmento = 'Acabados de Construcci??n';
UPDATE clientes SET segmento = 'Construcción' WHERE segmento = 'Construcci??n';
UPDATE clientes SET segmento = 'Consultorías y Servicios' WHERE segmento = 'Consultor??as y Servicios';
UPDATE clientes SET segmento = 'Energía Eléctrica' WHERE segmento = 'Energ??a El??ctrica';
UPDATE clientes SET segmento = 'Energía Renovable' WHERE segmento = 'Energ??a Renovable';
UPDATE clientes SET segmento = 'Minería' WHERE segmento = 'Miner??a';

UPDATE procesos SET segmento = 'Acabados de Construcción' WHERE segmento = 'Acabados de Construcci??n';
UPDATE procesos SET segmento = 'Construcción' WHERE segmento = 'Construcci??n';
UPDATE procesos SET segmento = 'Consultorías y Servicios' WHERE segmento = 'Consultor??as y Servicios';
UPDATE procesos SET segmento = 'Energía Eléctrica' WHERE segmento = 'Energ??a El??ctrica';
UPDATE procesos SET segmento = 'Energía Renovable' WHERE segmento = 'Energ??a Renovable';
UPDATE procesos SET segmento = 'Minería' WHERE segmento = 'Miner??a';

UPDATE proyecciones SET segmento = 'Acabados de Construcción' WHERE segmento = 'Acabados de Construcci??n';
UPDATE proyecciones SET segmento = 'Construcción' WHERE segmento = 'Construcci??n';
UPDATE proyecciones SET segmento = 'Consultorías y Servicios' WHERE segmento = 'Consultor??as y Servicios';
UPDATE proyecciones SET segmento = 'Energía Eléctrica' WHERE segmento = 'Energ??a El??ctrica';
UPDATE proyecciones SET segmento = 'Energía Renovable' WHERE segmento = 'Energ??a Renovable';
UPDATE proyecciones SET segmento = 'Minería' WHERE segmento = 'Miner??a';

-- Eliminar ítems corruptos si ya existe la versión correcta en el mismo país/tipo
DELETE cp_bad
FROM catalogo_pais cp_bad
INNER JOIN catalogo_pais cp_good
  ON cp_good.pais_id = cp_bad.pais_id
 AND cp_good.tipo = cp_bad.tipo
 AND cp_good.codigo = 'Acabados de Construcción'
WHERE cp_bad.tipo = 'segmento_cliente'
  AND cp_bad.codigo = 'Acabados de Construcci??n';

DELETE cp_bad
FROM catalogo_pais cp_bad
INNER JOIN catalogo_pais cp_good
  ON cp_good.pais_id = cp_bad.pais_id
 AND cp_good.tipo = cp_bad.tipo
 AND cp_good.codigo = 'Construcción'
WHERE cp_bad.tipo = 'segmento_cliente'
  AND cp_bad.codigo = 'Construcci??n';

DELETE cp_bad
FROM catalogo_pais cp_bad
INNER JOIN catalogo_pais cp_good
  ON cp_good.pais_id = cp_bad.pais_id
 AND cp_good.tipo = cp_bad.tipo
 AND cp_good.codigo = 'Consultorías y Servicios'
WHERE cp_bad.tipo = 'segmento_cliente'
  AND cp_bad.codigo = 'Consultor??as y Servicios';

DELETE cp_bad
FROM catalogo_pais cp_bad
INNER JOIN catalogo_pais cp_good
  ON cp_good.pais_id = cp_bad.pais_id
 AND cp_good.tipo = cp_bad.tipo
 AND cp_good.codigo = 'Energía Eléctrica'
WHERE cp_bad.tipo = 'segmento_cliente'
  AND cp_bad.codigo = 'Energ??a El??ctrica';

DELETE cp_bad
FROM catalogo_pais cp_bad
INNER JOIN catalogo_pais cp_good
  ON cp_good.pais_id = cp_bad.pais_id
 AND cp_good.tipo = cp_bad.tipo
 AND cp_good.codigo = 'Energía Renovable'
WHERE cp_bad.tipo = 'segmento_cliente'
  AND cp_bad.codigo = 'Energ??a Renovable';

DELETE cp_bad
FROM catalogo_pais cp_bad
INNER JOIN catalogo_pais cp_good
  ON cp_good.pais_id = cp_bad.pais_id
 AND cp_good.tipo = cp_bad.tipo
 AND cp_good.codigo = 'Minería'
WHERE cp_bad.tipo = 'segmento_cliente'
  AND cp_bad.codigo = 'Miner??a';

-- Corregir los que quedaron sin duplicado
UPDATE catalogo_pais SET codigo = 'Acabados de Construcción', etiqueta = 'Acabados de Construcción'
WHERE codigo = 'Acabados de Construcci??n';

UPDATE catalogo_pais SET codigo = 'Construcción', etiqueta = 'Construcción'
WHERE codigo = 'Construcci??n';

UPDATE catalogo_pais SET codigo = 'Consultorías y Servicios', etiqueta = 'Consultorías y Servicios'
WHERE codigo = 'Consultor??as y Servicios';

UPDATE catalogo_pais SET codigo = 'Energía Eléctrica', etiqueta = 'Energía Eléctrica'
WHERE codigo = 'Energ??a El??ctrica';

UPDATE catalogo_pais SET codigo = 'Energía Renovable', etiqueta = 'Energía Renovable'
WHERE codigo = 'Energ??a Renovable';

UPDATE catalogo_pais SET codigo = 'Minería', etiqueta = 'Minería'
WHERE codigo = 'Miner??a';

UPDATE catalogo_pais SET codigo = 'Cantón', etiqueta = 'Cantón'
WHERE tipo = 'etiqueta_geo_nivel2' AND codigo = 'nivel2' AND etiqueta = 'Cant??n';
