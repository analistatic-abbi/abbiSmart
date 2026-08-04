-- Fecha de alerta por relacionamiento (reemplaza días de espera fijos).
-- Ejecutar: Get-Content src\database\migrations\012_relacionamiento_fecha_alerta.sql | docker exec -i smartlicitaciones-back-mariadb-1 mariadb -uroot -prootpassword licitaciones_abbi

ALTER TABLE relacionamientos
  ADD COLUMN fecha_alerta_respuesta DATE NULL
  AFTER fecha_mensaje;

UPDATE relacionamientos
SET fecha_alerta_respuesta = DATE_ADD(fecha_mensaje, INTERVAL dias_espera_respuesta DAY)
WHERE fecha_alerta_respuesta IS NULL;

ALTER TABLE relacionamientos
  MODIFY fecha_alerta_respuesta DATE NOT NULL,
  DROP COLUMN dias_espera_respuesta;

DROP VIEW IF EXISTS vista_relacionamientos_vencidos;

CREATE VIEW vista_relacionamientos_vencidos AS
SELECT
    r.id,
    r.contacto_id,
    r.emisor_usuario_id,
    r.fecha_mensaje,
    r.fecha_alerta_respuesta AS fecha_limite_respuesta
FROM relacionamientos r
WHERE r.respuesta IS NULL
  AND r.eliminado = FALSE
  AND CURDATE() >= r.fecha_alerta_respuesta;
