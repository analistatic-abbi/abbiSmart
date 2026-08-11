-- Configuración y plantillas de tareas por país
CREATE TABLE IF NOT EXISTS `configuracion_pais` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `pais_id` BIGINT UNSIGNED NOT NULL,
  `clave` VARCHAR(100) NOT NULL,
  `valor` VARCHAR(255) NOT NULL,
  `descripcion` VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_pais_clave` (`pais_id`, `clave`),
  CONSTRAINT `fk_config_pais_pais` FOREIGN KEY (`pais_id`) REFERENCES `paises` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `plantilla_tarea_pais` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `pais_id` BIGINT UNSIGNED NOT NULL,
  `codigo` VARCHAR(80) NOT NULL,
  `nombre` VARCHAR(150) NOT NULL,
  `orden` SMALLINT UNSIGNED NOT NULL,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `aplica_rfi` TINYINT(1) NOT NULL DEFAULT 1,
  `requiere_fecha_adquisicion` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_plantilla_tarea_pais` (`pais_id`, `codigo`),
  CONSTRAINT `fk_plantilla_tarea_pais` FOREIGN KEY (`pais_id`) REFERENCES `paises` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `proceso_tareas`
  MODIFY COLUMN `tarea_codigo` VARCHAR(80) NOT NULL;

-- Config por país existente
INSERT IGNORE INTO `configuracion_pais` (`pais_id`, `clave`, `valor`, `descripcion`)
SELECT
  p.id,
  'calificacion_por_puntos_habilitada',
  IF(p.codigo_iso = 'CO', 'true', 'false'),
  'Habilita formatos de calificación por puntos y el panel de rúbrica en procesos'
FROM `paises` p;

INSERT IGNORE INTO `configuracion_pais` (`pais_id`, `clave`, `valor`, `descripcion`)
SELECT
  p.id,
  'indicador_margen_casi_pct',
  COALESCE(
    (SELECT cs.valor FROM configuracion_sistema cs WHERE cs.clave = 'indicador_margen_casi_pct' LIMIT 1),
    '5'
  ),
  'Margen % para zonas Casi Aprobado / Casi Desaprobado en evaluación de indicadores'
FROM `paises` p;

-- Plantilla de tareas default para cada país habilitado
INSERT IGNORE INTO `plantilla_tarea_pais`
  (`pais_id`, `codigo`, `nombre`, `orden`, `activo`, `aplica_rfi`, `requiere_fecha_adquisicion`)
SELECT p.id, t.codigo, t.nombre, t.orden, 1, t.aplica_rfi, t.requiere_fecha
FROM `paises` p
CROSS JOIN (
  SELECT 'Creacion_Carpeta' AS codigo, 'Creación de carpeta' AS nombre, 1 AS orden, 1 AS aplica_rfi, 0 AS requiere_fecha
  UNION ALL SELECT 'Manifestacion_Interes', 'Manifestación de interés', 2, 1, 0
  UNION ALL SELECT 'Adquisicion_Derecho_Participar', 'Adquisición derecho a participar', 3, 1, 1
  UNION ALL SELECT 'Preparar_Doc_Juridica', 'Preparar documentación jurídica', 4, 1, 0
  UNION ALL SELECT 'Preparar_Doc_Tecnica', 'Preparar documentación técnica', 5, 1, 0
  UNION ALL SELECT 'Preparar_Doc_Financiera', 'Preparar documentación financiera', 6, 1, 0
  UNION ALL SELECT 'Estructuracion_Administracion', 'Estructuración de administración', 7, 1, 0
  UNION ALL SELECT 'Solicitud_Pago_Poliza', 'Solicitud de pago de póliza', 8, 0, 0
  UNION ALL SELECT 'Pago_Poliza', 'Pago de póliza', 9, 0, 0
  UNION ALL SELECT 'Elaboracion_Propuesta_Economica', 'Elaboración de propuesta económica', 10, 1, 0
  UNION ALL SELECT 'Validacion_Area_Tecnica', 'Validación área técnica', 11, 1, 0
  UNION ALL SELECT 'Envio_Propuesta', 'Envío de propuesta', 12, 1, 0
) t;
