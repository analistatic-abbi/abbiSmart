-- Formato de encuesta rico: secciones, items (subsecciones), veredictos
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `formato_encuesta_secciones` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `formato_encuesta_id` BIGINT UNSIGNED NOT NULL,
  `orden` SMALLINT UNSIGNED NOT NULL,
  `titulo` VARCHAR(250) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_formato_encuesta_seccion_orden` (`formato_encuesta_id`, `orden`),
  CONSTRAINT `fk_formato_encuesta_secciones_formato`
    FOREIGN KEY (`formato_encuesta_id`) REFERENCES `formatos_encuesta` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Permitir asociar preguntas a sección (migración gradual)
ALTER TABLE `formato_encuesta_preguntas`
  ADD COLUMN `seccion_id` BIGINT UNSIGNED NULL AFTER `formato_encuesta_id`;

-- Crear sección default y asociar preguntas legacy
INSERT INTO `formato_encuesta_secciones` (`formato_encuesta_id`, `orden`, `titulo`)
SELECT f.`id`, 1, 'Sección 1'
FROM `formatos_encuesta` f
WHERE NOT EXISTS (
  SELECT 1 FROM `formato_encuesta_secciones` s WHERE s.`formato_encuesta_id` = f.`id`
);

UPDATE `formato_encuesta_preguntas` p
INNER JOIN `formato_encuesta_secciones` s
  ON s.`formato_encuesta_id` = p.`formato_encuesta_id` AND s.`orden` = 1
SET p.`seccion_id` = s.`id`
WHERE p.`seccion_id` IS NULL;

CREATE TABLE IF NOT EXISTS `formato_encuesta_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `pregunta_id` BIGINT UNSIGNED NOT NULL,
  `orden` SMALLINT UNSIGNED NOT NULL,
  `subseccion` VARCHAR(250) NULL,
  `requiere_calificacion` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_formato_encuesta_item_orden` (`pregunta_id`, `orden`),
  CONSTRAINT `fk_formato_encuesta_items_pregunta`
    FOREIGN KEY (`pregunta_id`) REFERENCES `formato_encuesta_preguntas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Un item por cada pregunta legacy (calificable, sin subsección)
INSERT INTO `formato_encuesta_items` (`pregunta_id`, `orden`, `subseccion`, `requiere_calificacion`)
SELECT p.`id`, 1, NULL, 1
FROM `formato_encuesta_preguntas` p
WHERE NOT EXISTS (
  SELECT 1 FROM `formato_encuesta_items` i WHERE i.`pregunta_id` = p.`id`
);

-- Respuestas: agregar item_id y migrar desde pregunta
ALTER TABLE `kam_encuesta_respuestas`
  ADD COLUMN `item_id` BIGINT UNSIGNED NULL AFTER `contacto_id`;

UPDATE `kam_encuesta_respuestas` r
INNER JOIN `formato_encuesta_items` i ON i.`pregunta_id` = r.`pregunta_id` AND i.`orden` = 1
SET r.`item_id` = i.`id`
WHERE r.`item_id` IS NULL;

-- Limpiar respuestas huérfanas sin item (no deberían existir)
DELETE FROM `kam_encuesta_respuestas` WHERE `item_id` IS NULL;

ALTER TABLE `kam_encuesta_respuestas`
  MODIFY COLUMN `item_id` BIGINT UNSIGNED NOT NULL,
  MODIFY COLUMN `puntaje` TINYINT UNSIGNED NULL,
  MODIFY COLUMN `observacion` TEXT NULL;

-- Quitar FK/UK antiguas de pregunta_id
-- El unique compuesto (encuesta_id,...) sostiene el FK de encuesta_id: crear índice propio primero
ALTER TABLE `kam_encuesta_respuestas`
  ADD KEY `idx_kam_encuesta_respuestas_encuesta` (`encuesta_id`);

ALTER TABLE `kam_encuesta_respuestas`
  DROP FOREIGN KEY `fk_kam_encuesta_respuestas_pregunta`,
  DROP INDEX `uk_kam_encuesta_respuesta`,
  DROP INDEX `idx_kam_encuesta_respuestas_pregunta`;

ALTER TABLE `kam_encuesta_respuestas`
  DROP COLUMN `pregunta_id`,
  ADD UNIQUE KEY `uk_kam_encuesta_respuesta` (`encuesta_id`, `contacto_id`, `item_id`),
  ADD KEY `idx_kam_encuesta_respuestas_item` (`item_id`),
  ADD CONSTRAINT `fk_kam_encuesta_respuestas_item`
    FOREIGN KEY (`item_id`) REFERENCES `formato_encuesta_items` (`id`);

-- Preguntas: pasar a depender de sección
ALTER TABLE `formato_encuesta_preguntas`
  DROP FOREIGN KEY `fk_formato_encuesta_preguntas_formato`,
  DROP INDEX `uk_formato_encuesta_pregunta_orden`;

ALTER TABLE `formato_encuesta_preguntas`
  DROP COLUMN `formato_encuesta_id`,
  MODIFY COLUMN `seccion_id` BIGINT UNSIGNED NOT NULL,
  ADD UNIQUE KEY `uk_formato_encuesta_pregunta_orden` (`seccion_id`, `orden`),
  ADD CONSTRAINT `fk_formato_encuesta_preguntas_seccion`
    FOREIGN KEY (`seccion_id`) REFERENCES `formato_encuesta_secciones` (`id`) ON DELETE CASCADE;

-- Veredictos encuesta y ronda
ALTER TABLE `kam_encuestas`
  ADD COLUMN `veredicto` TEXT NULL AFTER `formato_encuesta_id`,
  ADD COLUMN `veredicto_editado` TINYINT(1) NOT NULL DEFAULT 0 AFTER `veredicto`;

ALTER TABLE `kam_rondas`
  ADD COLUMN `veredicto` TEXT NULL AFTER `bitacora`,
  ADD COLUMN `veredicto_editado` TINYINT(1) NOT NULL DEFAULT 0 AFTER `veredicto`;
