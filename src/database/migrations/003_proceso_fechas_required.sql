-- FEC-001: apertura y cierre obligatorias al crear el proceso
-- Ejecutar después de 002 si aplica: mysql -u user -p licitaciones_abbi < src/database/migrations/003_proceso_fechas_required.sql

UPDATE procesos
SET
  fecha_apertura = COALESCE(fecha_apertura, '2026-01-01'),
  fecha_cierre = COALESCE(fecha_cierre, '2026-06-30')
WHERE fecha_apertura IS NULL OR fecha_cierre IS NULL;

ALTER TABLE procesos DROP CONSTRAINT IF EXISTS chk_fechas_dentro_rango;

ALTER TABLE procesos
  MODIFY COLUMN fecha_apertura DATE NOT NULL,
  MODIFY COLUMN fecha_cierre DATE NOT NULL;

ALTER TABLE procesos ADD CONSTRAINT chk_fechas_dentro_rango CHECK (
  fecha_cierre >= fecha_apertura
  AND (fecha_manifestacion_interes IS NULL OR fecha_manifestacion_interes BETWEEN fecha_apertura AND fecha_cierre)
  AND (fecha_adquisicion_derecho IS NULL OR fecha_adquisicion_derecho BETWEEN fecha_apertura AND fecha_cierre)
  AND (fecha_reunion_aclaratoria IS NULL OR fecha_reunion_aclaratoria BETWEEN fecha_apertura AND fecha_cierre)
  AND (fecha_visita_tecnica IS NULL OR fecha_visita_tecnica BETWEEN fecha_apertura AND fecha_cierre)
  AND (fecha_solicitudes_aclaracion IS NULL OR fecha_solicitudes_aclaracion BETWEEN fecha_apertura AND fecha_cierre)
  AND (fecha_respuesta_aclaracion IS NULL OR fecha_respuesta_aclaracion BETWEEN fecha_apertura AND fecha_cierre)
  AND (fecha_limitacion_mypymes IS NULL OR fecha_limitacion_mypymes BETWEEN fecha_apertura AND fecha_cierre)
);
