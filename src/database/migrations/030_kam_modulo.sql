-- Módulo KAM: kams, rondas, formatos de encuesta e instancias
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `kams` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `proceso_id` BIGINT UNSIGNED NOT NULL,
  `pais_id` BIGINT UNSIGNED NOT NULL,
  `empresa_cliente_id` BIGINT UNSIGNED NOT NULL,
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `creado_por_id` BIGINT UNSIGNED NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_kams_proceso` (`proceso_id`),
  KEY `idx_kams_pais` (`pais_id`),
  KEY `idx_kams_cliente` (`empresa_cliente_id`),
  CONSTRAINT `fk_kams_proceso`
    FOREIGN KEY (`proceso_id`) REFERENCES `procesos` (`id`),
  CONSTRAINT `fk_kams_pais`
    FOREIGN KEY (`pais_id`) REFERENCES `paises` (`id`),
  CONSTRAINT `fk_kams_cliente`
    FOREIGN KEY (`empresa_cliente_id`) REFERENCES `clientes` (`id`),
  CONSTRAINT `fk_kams_creado_por`
    FOREIGN KEY (`creado_por_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `kam_rondas` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kam_id` BIGINT UNSIGNED NOT NULL,
  `numero` SMALLINT UNSIGNED NOT NULL,
  `estado` ENUM('Pendiente', 'Ejecutado', 'Socializado') NOT NULL DEFAULT 'Pendiente',
  `fecha_programada` DATE NULL,
  `fecha_reunion_socializacion` DATE NULL,
  `bitacora` TEXT NULL,
  `correspondencia_nombre` VARCHAR(255) NULL,
  `correspondencia_ruta` VARCHAR(500) NULL,
  `ejecutado_manual` TINYINT(1) NOT NULL DEFAULT 0,
  `socializado_por_id` BIGINT UNSIGNED NULL,
  `fecha_socializado` DATETIME NULL,
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_kam_rondas_numero` (`kam_id`, `numero`),
  KEY `idx_kam_rondas_estado` (`estado`),
  CONSTRAINT `fk_kam_rondas_kam`
    FOREIGN KEY (`kam_id`) REFERENCES `kams` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_kam_rondas_socializado_por`
    FOREIGN KEY (`socializado_por_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `formatos_encuesta` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `pais_id` BIGINT UNSIGNED NOT NULL,
  `nombre` VARCHAR(150) NOT NULL,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `clonado_de_id` BIGINT UNSIGNED NULL,
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_formato_encuesta_pais_nombre` (`pais_id`, `nombre`),
  KEY `idx_formatos_encuesta_clonado` (`clonado_de_id`),
  CONSTRAINT `fk_formatos_encuesta_pais`
    FOREIGN KEY (`pais_id`) REFERENCES `paises` (`id`),
  CONSTRAINT `fk_formatos_encuesta_clonado`
    FOREIGN KEY (`clonado_de_id`) REFERENCES `formatos_encuesta` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `formato_encuesta_preguntas` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `formato_encuesta_id` BIGINT UNSIGNED NOT NULL,
  `orden` SMALLINT UNSIGNED NOT NULL,
  `texto` VARCHAR(500) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_formato_encuesta_pregunta_orden` (`formato_encuesta_id`, `orden`),
  CONSTRAINT `fk_formato_encuesta_preguntas_formato`
    FOREIGN KEY (`formato_encuesta_id`) REFERENCES `formatos_encuesta` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `kam_encuestas` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ronda_id` BIGINT UNSIGNED NOT NULL,
  `formato_encuesta_id` BIGINT UNSIGNED NOT NULL,
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kam_encuestas_ronda` (`ronda_id`),
  KEY `idx_kam_encuestas_formato` (`formato_encuesta_id`),
  CONSTRAINT `fk_kam_encuestas_ronda`
    FOREIGN KEY (`ronda_id`) REFERENCES `kam_rondas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_kam_encuestas_formato`
    FOREIGN KEY (`formato_encuesta_id`) REFERENCES `formatos_encuesta` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `kam_encuesta_contactos` (
  `encuesta_id` BIGINT UNSIGNED NOT NULL,
  `contacto_id` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`encuesta_id`, `contacto_id`),
  KEY `idx_kam_encuesta_contactos_contacto` (`contacto_id`),
  CONSTRAINT `fk_kam_encuesta_contactos_encuesta`
    FOREIGN KEY (`encuesta_id`) REFERENCES `kam_encuestas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_kam_encuesta_contactos_contacto`
    FOREIGN KEY (`contacto_id`) REFERENCES `contactos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `kam_encuesta_respuestas` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `encuesta_id` BIGINT UNSIGNED NOT NULL,
  `contacto_id` BIGINT UNSIGNED NOT NULL,
  `pregunta_id` BIGINT UNSIGNED NOT NULL,
  `puntaje` TINYINT UNSIGNED NOT NULL,
  `observacion` VARCHAR(500) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_kam_encuesta_respuesta` (`encuesta_id`, `contacto_id`, `pregunta_id`),
  KEY `idx_kam_encuesta_respuestas_contacto` (`contacto_id`),
  KEY `idx_kam_encuesta_respuestas_pregunta` (`pregunta_id`),
  CONSTRAINT `fk_kam_encuesta_respuestas_encuesta`
    FOREIGN KEY (`encuesta_id`) REFERENCES `kam_encuestas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_kam_encuesta_respuestas_contacto`
    FOREIGN KEY (`contacto_id`) REFERENCES `contactos` (`id`),
  CONSTRAINT `fk_kam_encuesta_respuestas_pregunta`
    FOREIGN KEY (`pregunta_id`) REFERENCES `formato_encuesta_preguntas` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
