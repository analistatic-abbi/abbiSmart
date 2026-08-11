-- Contactos vinculados a procesos (pool para encuestas KAM)
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `proceso_contactos` (
  `proceso_id` BIGINT UNSIGNED NOT NULL,
  `contacto_id` BIGINT UNSIGNED NOT NULL,
  `fecha_asociacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`proceso_id`, `contacto_id`),
  KEY `idx_proceso_contactos_contacto` (`contacto_id`),
  CONSTRAINT `fk_proceso_contactos_proceso`
    FOREIGN KEY (`proceso_id`) REFERENCES `procesos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_proceso_contactos_contacto`
    FOREIGN KEY (`contacto_id`) REFERENCES `contactos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
