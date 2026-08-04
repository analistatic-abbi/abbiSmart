-- Bandeja personal: fijaciones por usuario (proceso, proyección, relacionamiento).
-- Ejecutar: Get-Content src\database\migrations\020_usuario_fijaciones.sql | docker exec -i smartlicitaciones-back-mariadb-1 mariadb -uroot -prootpassword licitaciones_abbi

CREATE TABLE IF NOT EXISTS usuario_fijaciones (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id BIGINT UNSIGNED NOT NULL,
  entidad_tipo ENUM('proceso', 'proyeccion', 'relacionamiento') NOT NULL,
  entidad_id BIGINT UNSIGNED NOT NULL,
  fecha_fijacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_usuario_fijacion (usuario_id, entidad_tipo, entidad_id),
  KEY idx_usuario_fijaciones_usuario (usuario_id, fecha_fijacion),
  CONSTRAINT fk_usuario_fijaciones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
