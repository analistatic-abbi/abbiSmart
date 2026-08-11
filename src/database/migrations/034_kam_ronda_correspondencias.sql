-- Correspondencia múltiple por ronda KAM
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `kam_ronda_correspondencias` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ronda_id` BIGINT UNSIGNED NOT NULL,
  `nombre` VARCHAR(255) NOT NULL,
  `ruta` VARCHAR(500) NOT NULL,
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kam_ronda_correspondencias_ronda` (`ronda_id`),
  CONSTRAINT `fk_kam_ronda_correspondencias_ronda`
    FOREIGN KEY (`ronda_id`) REFERENCES `kam_rondas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrar archivo único existente
INSERT INTO `kam_ronda_correspondencias` (`ronda_id`, `nombre`, `ruta`)
SELECT `id`, `correspondencia_nombre`, `correspondencia_ruta`
FROM `kam_rondas`
WHERE `correspondencia_ruta` IS NOT NULL
  AND `correspondencia_nombre` IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `kam_ronda_correspondencias` c WHERE c.`ronda_id` = `kam_rondas`.`id`
  );
