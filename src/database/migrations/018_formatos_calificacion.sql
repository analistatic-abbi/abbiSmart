-- Formatos de calificación por puntos (evaluación alternativa a Cumple/No Cumple).
-- Ejecutar: Get-Content src\database\migrations\018_formatos_calificacion.sql | docker exec -i smartlicitaciones-back-mariadb-1 mariadb -uroot -prootpassword licitaciones_abbi

CREATE TABLE IF NOT EXISTS formatos_calificacion (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pais_id BIGINT UNSIGNED NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  puntaje_minimo INT UNSIGNED NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  usuario_creo_id BIGINT UNSIGNED NOT NULL,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_formato_pais_nombre (pais_id, nombre),
  KEY idx_formato_pais_activo (pais_id, activo),
  CONSTRAINT fk_formato_pais FOREIGN KEY (pais_id) REFERENCES paises (id),
  CONSTRAINT fk_formato_usuario_creo FOREIGN KEY (usuario_creo_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS formato_calificacion_rangos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  formato_id BIGINT UNSIGNED NOT NULL,
  indicador_codigo ENUM('KTNO','PN','ROE','ROA','MDN','IL','E','RCI') NOT NULL,
  orden TINYINT UNSIGNED NOT NULL,
  rango_min DECIMAL(18,4) NULL,
  rango_max DECIMAL(18,4) NULL,
  puntos INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_formato_indicador_orden (formato_id, indicador_codigo, orden),
  KEY idx_formato_rango_formato (formato_id),
  CONSTRAINT fk_formato_rango_formato FOREIGN KEY (formato_id) REFERENCES formatos_calificacion (id) ON DELETE RESTRICT,
  CONSTRAINT chk_formato_rango_orden CHECK (orden BETWEEN 1 AND 4)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS proceso_calificaciones (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  proceso_id BIGINT UNSIGNED NOT NULL,
  formato_calificacion_id BIGINT UNSIGNED NOT NULL,
  anio_parametros SMALLINT UNSIGNED NOT NULL,
  puntaje_total INT UNSIGNED NOT NULL,
  puntaje_minimo INT UNSIGNED NOT NULL,
  resultado ENUM('Aprobado', 'No Aprobado') NOT NULL,
  usuario_evaluo_id BIGINT UNSIGNED NOT NULL,
  fecha_evaluacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_proceso_formato_calificacion (proceso_id, formato_calificacion_id),
  KEY idx_proceso_calificacion_proceso (proceso_id),
  CONSTRAINT fk_proceso_calificacion_proceso FOREIGN KEY (proceso_id) REFERENCES procesos (id),
  CONSTRAINT fk_proceso_calificacion_formato FOREIGN KEY (formato_calificacion_id) REFERENCES formatos_calificacion (id),
  CONSTRAINT fk_proceso_calificacion_usuario FOREIGN KEY (usuario_evaluo_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS proceso_calificacion_detalle (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  proceso_calificacion_id BIGINT UNSIGNED NOT NULL,
  indicador_codigo ENUM('KTNO','PN','ROE','ROA','MDN','IL','E','RCI') NOT NULL,
  parametro_financiero_id BIGINT UNSIGNED NOT NULL,
  valor_abbi DECIMAL(18,4) NOT NULL,
  formato_rango_id BIGINT UNSIGNED NOT NULL,
  puntos_obtenidos INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_calificacion_detalle_indicador (proceso_calificacion_id, indicador_codigo),
  CONSTRAINT fk_calificacion_detalle_calificacion FOREIGN KEY (proceso_calificacion_id) REFERENCES proceso_calificaciones (id) ON DELETE CASCADE,
  CONSTRAINT fk_calificacion_detalle_parametro FOREIGN KEY (parametro_financiero_id) REFERENCES parametros_financieros (id),
  CONSTRAINT fk_calificacion_detalle_rango FOREIGN KEY (formato_rango_id) REFERENCES formato_calificacion_rangos (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
