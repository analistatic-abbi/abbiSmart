-- Migración: pais_id en proyecciones + vista listado enriquecida
-- Ejecutar sobre BD existente: mysql -u user -p licitaciones_abbi < src/database/migrations/001_proyeccion_pais_y_vistas.sql

ALTER TABLE proyecciones
  ADD COLUMN pais_id BIGINT UNSIGNED NULL AFTER proceso_resultante_id;

UPDATE proyecciones py
LEFT JOIN procesos po ON po.id = py.proceso_origen_id
LEFT JOIN procesos pr ON pr.id = py.proceso_resultante_id
SET py.pais_id = COALESCE(po.pais_id, pr.pais_id)
WHERE py.pais_id IS NULL;

UPDATE proyecciones SET pais_id = (SELECT id FROM paises WHERE nombre = 'Colombia' LIMIT 1)
WHERE pais_id IS NULL;

ALTER TABLE proyecciones
  MODIFY COLUMN pais_id BIGINT UNSIGNED NOT NULL,
  ADD CONSTRAINT fk_proyeccion_pais FOREIGN KEY (pais_id) REFERENCES paises(id),
  ADD INDEX idx_proyeccion_pais (pais_id);

DROP VIEW IF EXISTS vista_proyecciones_listado;

CREATE VIEW vista_proyecciones_listado AS
SELECT
    py.id,
    py.pais_id,
    py.proceso_origen_id,
    py.proceso_resultante_id,
    py.anio_proyectado,
    py.fecha_estimada_publicacion,
    py.valor_venta,
    py.valor_facturacion,
    py.estado,
    py.mercado,
    py.fecha_creacion,
    v.dias_faltantes,
    v.estado_sugerido,
    COALESCE(po.codigo, pr.codigo) AS proceso_codigo,
    COALESCE(
        c_origen.empresa,
        c_res.empresa,
        po.empresa_otro,
        pr.empresa_otro
    ) AS empresa,
    COALESCE(po.segmento, pr.segmento) AS segmento
FROM proyecciones py
INNER JOIN vista_proyecciones_calculado v ON v.id = py.id
LEFT JOIN procesos po ON po.id = py.proceso_origen_id
LEFT JOIN procesos pr ON pr.id = py.proceso_resultante_id
LEFT JOIN clientes c_origen ON c_origen.id = po.empresa_cliente_id
LEFT JOIN clientes c_res ON c_res.id = pr.empresa_cliente_id
WHERE py.eliminado = FALSE;
