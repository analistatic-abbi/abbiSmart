-- Bitácora de entradas por ronda KAM (append-only, como comentarios de proceso)
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `kam_ronda_bitacora` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ronda_id` BIGINT UNSIGNED NOT NULL,
  `usuario_id` BIGINT UNSIGNED NOT NULL,
  `texto` TEXT NOT NULL,
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kam_ronda_bitacora_ronda` (`ronda_id`, `fecha_creacion`),
  CONSTRAINT `fk_kam_ronda_bitacora_ronda`
    FOREIGN KEY (`ronda_id`) REFERENCES `kam_rondas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_kam_ronda_bitacora_usuario`
    FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrar texto legado de bitácora (si existe) como primera entrada
INSERT INTO `kam_ronda_bitacora` (`ronda_id`, `usuario_id`, `texto`, `fecha_creacion`)
SELECT
  r.`id`,
  COALESCE(k.`creado_por_id`, (
    SELECT u.`id` FROM `usuarios` u ORDER BY u.`id` ASC LIMIT 1
  )),
  r.`bitacora`,
  r.`fecha_creacion`
FROM `kam_rondas` r
INNER JOIN `kams` k ON k.`id` = r.`kam_id`
WHERE r.`bitacora` IS NOT NULL
  AND TRIM(r.`bitacora`) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM `kam_ronda_bitacora` b WHERE b.`ronda_id` = r.`id`
  );
