-- Campos manuales en proyecciones + vista listado con COALESCE
-- Ejecutar: Get-Content src\database\migrations\015_proyeccion_manual_campos.sql | docker exec -i smartlicitaciones-back-mariadb-1 mariadb -uroot -prootpassword licitaciones_abbi

ALTER TABLE proyecciones
  ADD COLUMN empresa_cliente_id BIGINT UNSIGNED NULL AFTER proceso_resultante_id,
  ADD COLUMN empresa_otro VARCHAR(255) NULL AFTER empresa_cliente_id,
  ADD COLUMN segmento ENUM(
    'Gas Natural',
    'Alcantarillado',
    'Electricidad',
    'Obra Civil',
    'Servicios Adicionales'
  ) NULL AFTER empresa_otro,
  ADD KEY idx_proyeccion_empresa_cliente (empresa_cliente_id),
  ADD CONSTRAINT fk_proyeccion_empresa_cliente
    FOREIGN KEY (empresa_cliente_id) REFERENCES clientes (id);

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
    COALESCE(po.codigo, po.id_digitado, pr.codigo, pr.id_digitado) AS proceso_codigo,
    COALESCE(
        c_manual.empresa,
        c_origen.empresa,
        c_res.empresa,
        py.empresa_otro,
        po.empresa_otro,
        pr.empresa_otro
    ) AS empresa,
    COALESCE(py.segmento, po.segmento, pr.segmento) AS segmento,
    COALESCE(py.objeto, po.objeto, pr.objeto) AS objeto
FROM proyecciones py
INNER JOIN vista_proyecciones_calculado v ON v.id = py.id
LEFT JOIN clientes c_manual ON c_manual.id = py.empresa_cliente_id
LEFT JOIN procesos po ON po.id = py.proceso_origen_id
LEFT JOIN procesos pr ON pr.id = py.proceso_resultante_id
LEFT JOIN clientes c_origen ON c_origen.id = po.empresa_cliente_id
LEFT JOIN clientes c_res ON c_res.id = pr.empresa_cliente_id
WHERE py.eliminado = FALSE;
