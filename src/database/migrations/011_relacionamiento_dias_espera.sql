-- Días de espera por relacionamiento y eliminación de configuración global.
-- Ejecutar: Get-Content src\database\migrations\011_relacionamiento_dias_espera.sql | docker exec -i smartlicitaciones-back-mariadb-1 mariadb -uroot -prootpassword licitaciones_abbi

ALTER TABLE relacionamientos
  ADD COLUMN dias_espera_respuesta INT UNSIGNED NOT NULL DEFAULT 7
  AFTER fecha_mensaje;

DROP VIEW IF EXISTS vista_relacionamientos_vencidos;

CREATE VIEW vista_relacionamientos_vencidos AS
SELECT
    r.id,
    r.contacto_id,
    r.emisor_usuario_id,
    r.fecha_mensaje,
    r.dias_espera_respuesta AS dias_espera_configurado,
    DATE_ADD(r.fecha_mensaje, INTERVAL r.dias_espera_respuesta DAY) AS fecha_limite_respuesta
FROM relacionamientos r
WHERE r.respuesta IS NULL
  AND r.eliminado = FALSE
  AND CURDATE() > DATE_ADD(r.fecha_mensaje, INTERVAL r.dias_espera_respuesta DAY);

DELETE FROM configuracion_sistema
WHERE clave IN ('dias_espera_respuesta_crm', 'carga_masiva_habilitada');
