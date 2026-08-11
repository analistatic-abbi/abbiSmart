-- Catálogos de negocio por país
CREATE TABLE IF NOT EXISTS `catalogo_pais` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `pais_id` BIGINT UNSIGNED NOT NULL,
  `tipo` VARCHAR(40) NOT NULL,
  `codigo` VARCHAR(100) NOT NULL,
  `etiqueta` VARCHAR(150) NOT NULL,
  `orden` SMALLINT UNSIGNED NOT NULL,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_catalogo_pais` (`pais_id`, `tipo`, `codigo`),
  CONSTRAINT `fk_catalogo_pais_pais` FOREIGN KEY (`pais_id`) REFERENCES `paises` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Segmentos como VARCHAR para soportar catálogos editables
ALTER TABLE `procesos`
  MODIFY COLUMN `segmento` VARCHAR(100) NOT NULL;

ALTER TABLE `clientes`
  MODIFY COLUMN `segmento` VARCHAR(100) NOT NULL;

ALTER TABLE `proyecciones`
  MODIFY COLUMN `segmento` VARCHAR(100) NULL;

-- Seed catálogos para países existentes
INSERT IGNORE INTO `catalogo_pais` (`pais_id`, `tipo`, `codigo`, `etiqueta`, `orden`, `activo`)
SELECT p.id, 'segmento_proceso', t.codigo, t.etiqueta, t.orden, 1
FROM `paises` p
CROSS JOIN (
  SELECT 'Gas Natural' AS codigo, 'Gas Natural' AS etiqueta, 1 AS orden
  UNION ALL SELECT 'Alcantarillado', 'Alcantarillado', 2
  UNION ALL SELECT 'Electricidad', 'Electricidad', 3
  UNION ALL SELECT 'Obra Civil', 'Obra Civil', 4
  UNION ALL SELECT 'Servicios Adicionales', 'Servicios Adicionales', 5
) t;

INSERT IGNORE INTO `catalogo_pais` (`pais_id`, `tipo`, `codigo`, `etiqueta`, `orden`, `activo`)
SELECT p.id, 'segmento_cliente', t.codigo, t.etiqueta, t.orden, 1
FROM `paises` p
CROSS JOIN (
  SELECT 'Acabados de Construcción' AS codigo, 'Acabados de Construcción' AS etiqueta, 1 AS orden
  UNION ALL SELECT 'Actividades de Organizaciones Profesionales', 'Actividades de Organizaciones Profesionales', 2
  UNION ALL SELECT 'Construcción', 'Construcción', 3
  UNION ALL SELECT 'Consultorías y Servicios', 'Consultorías y Servicios', 4
  UNION ALL SELECT 'Energía Eléctrica', 'Energía Eléctrica', 5
  UNION ALL SELECT 'Energía Renovable', 'Energía Renovable', 6
  UNION ALL SELECT 'Gas Natural', 'Gas Natural', 7
  UNION ALL SELECT 'Hidrocarburos', 'Hidrocarburos', 8
  UNION ALL SELECT 'Manufactura', 'Manufactura', 9
  UNION ALL SELECT 'Minería', 'Minería', 10
  UNION ALL SELECT 'Servicios Petroleros', 'Servicios Petroleros', 11
  UNION ALL SELECT 'Otro', 'Otro', 12
) t;

INSERT IGNORE INTO `catalogo_pais` (`pais_id`, `tipo`, `codigo`, `etiqueta`, `orden`, `activo`)
SELECT p.id, 'indicador', t.codigo, t.etiqueta, t.orden, 1
FROM `paises` p
CROSS JOIN (
  SELECT 'KTNO' AS codigo, 'KTNO' AS etiqueta, 1 AS orden
  UNION ALL SELECT 'PN', 'PN', 2
  UNION ALL SELECT 'ROE', 'ROE', 3
  UNION ALL SELECT 'ROA', 'ROA', 4
  UNION ALL SELECT 'MDN', 'MDN', 5
  UNION ALL SELECT 'IL', 'IL', 6
  UNION ALL SELECT 'E', 'E', 7
  UNION ALL SELECT 'RCI', 'RCI', 8
) t;

INSERT IGNORE INTO `catalogo_pais` (`pais_id`, `tipo`, `codigo`, `etiqueta`, `orden`, `activo`)
SELECT p.id, 'portal_origen', t.codigo, t.etiqueta, t.orden, 1
FROM `paises` p
JOIN (
  SELECT 'SECOP II' AS codigo, 'SECOP II' AS etiqueta, 1 AS orden, 'CO' AS iso
  UNION ALL SELECT 'TEJIDO', 'TEJIDO', 2, 'CO'
  UNION ALL SELECT 'Otro', 'Otro', 99, 'CO'
  UNION ALL SELECT 'SEACE', 'SEACE', 1, 'PE'
  UNION ALL SELECT 'OSCE', 'OSCE', 2, 'PE'
  UNION ALL SELECT 'Otro', 'Otro', 99, 'PE'
  UNION ALL SELECT 'Otro', 'Otro', 1, '*'
) t ON (p.codigo_iso = t.iso OR t.iso = '*')
WHERE NOT EXISTS (
  SELECT 1 FROM `catalogo_pais` cp
  WHERE cp.pais_id = p.id AND cp.tipo = 'portal_origen' AND cp.codigo = t.codigo
);

INSERT IGNORE INTO `catalogo_pais` (`pais_id`, `tipo`, `codigo`, `etiqueta`, `orden`, `activo`)
SELECT p.id, t.tipo, t.codigo, t.etiqueta, t.orden, 1
FROM `paises` p
JOIN (
  SELECT 'etiqueta_geo_nivel1' AS tipo, 'nivel1' AS codigo, 'Departamento' AS etiqueta, 1 AS orden, 'CO' AS iso
  UNION ALL SELECT 'etiqueta_geo_nivel2', 'nivel2', 'Municipio', 1, 'CO'
  UNION ALL SELECT 'etiqueta_geo_nivel1', 'nivel1', 'Departamento', 1, 'PE'
  UNION ALL SELECT 'etiqueta_geo_nivel2', 'nivel2', 'Provincia', 1, 'PE'
  UNION ALL SELECT 'etiqueta_geo_nivel1', 'nivel1', 'Provincia', 1, 'EC'
  UNION ALL SELECT 'etiqueta_geo_nivel2', 'nivel2', 'Cantón', 1, 'EC'
  UNION ALL SELECT 'etiqueta_geo_nivel1', 'nivel1', 'Departamento', 1, '*'
  UNION ALL SELECT 'etiqueta_geo_nivel2', 'nivel2', 'Municipio', 1, '*'
) t ON (p.codigo_iso = t.iso OR (t.iso = '*' AND p.codigo_iso NOT IN ('CO', 'PE', 'EC')));
