-- Detalle de registros creados por carga masiva y estado de reversión.
-- Ejecutar: Get-Content src\database\migrations\021_carga_masiva_detalle_creados.sql | docker exec -i smartlicitaciones-back-mariadb-1 mariadb -uroot -prootpassword licitaciones_abbi

ALTER TABLE carga_masiva_log
  ADD COLUMN IF NOT EXISTS detalle_creados LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(detalle_creados)),
  ADD COLUMN IF NOT EXISTS revertida TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha_reversion DATETIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS revertida_por_id BIGINT UNSIGNED DEFAULT NULL;
