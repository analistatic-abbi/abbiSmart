-- Metas anuales de adjudicación y facturación por país.
-- Ejecutar: Get-Content src\database\migrations\037_metas_anuales.sql | docker exec -i smartlicitaciones-back-mariadb-1 mariadb -uroot -prootpassword licitaciones_abbi

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `metas_anuales` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `pais_id` BIGINT UNSIGNED NOT NULL,
  `anio` SMALLINT UNSIGNED NOT NULL,
  `meta_adjudicacion` DECIMAL(18,2) NOT NULL,
  `meta_facturacion` DECIMAL(18,2) NOT NULL,
  `actualizado_por_id` BIGINT UNSIGNED NOT NULL,
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_metas_anuales_pais_anio` (`pais_id`, `anio`),
  KEY `idx_metas_anuales_actualizado_por` (`actualizado_por_id`),
  CONSTRAINT `fk_metas_anuales_pais`
    FOREIGN KEY (`pais_id`) REFERENCES `paises` (`id`),
  CONSTRAINT `fk_metas_anuales_actualizado_por`
    FOREIGN KEY (`actualizado_por_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
