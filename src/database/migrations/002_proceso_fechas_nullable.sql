-- FEC-003: las fechas se configuran tras validar indicadores (no en el alta del proceso)
-- Ejecutar: mysql -u user -p licitaciones_abbi < src/database/migrations/002_proceso_fechas_nullable.sql
-- MariaDB: usar DROP CONSTRAINT (no DROP CHECK)

ALTER TABLE procesos DROP CONSTRAINT IF EXISTS chk_fechas_dentro_rango;

ALTER TABLE procesos
  MODIFY COLUMN fecha_apertura DATE NULL,
  MODIFY COLUMN fecha_cierre DATE NULL;

ALTER TABLE procesos ADD CONSTRAINT chk_fechas_dentro_rango CHECK (
  (fecha_apertura IS NULL AND fecha_cierre IS NULL)
  OR (
    fecha_apertura IS NOT NULL
    AND fecha_cierre IS NOT NULL
    AND fecha_cierre >= fecha_apertura
    AND (fecha_manifestacion_interes IS NULL OR fecha_manifestacion_interes BETWEEN fecha_apertura AND fecha_cierre)
    AND (fecha_adquisicion_derecho IS NULL OR fecha_adquisicion_derecho BETWEEN fecha_apertura AND fecha_cierre)
    AND (fecha_reunion_aclaratoria IS NULL OR fecha_reunion_aclaratoria BETWEEN fecha_apertura AND fecha_cierre)
    AND (fecha_visita_tecnica IS NULL OR fecha_visita_tecnica BETWEEN fecha_apertura AND fecha_cierre)
    AND (fecha_solicitudes_aclaracion IS NULL OR fecha_solicitudes_aclaracion BETWEEN fecha_apertura AND fecha_cierre)
    AND (fecha_respuesta_aclaracion IS NULL OR fecha_respuesta_aclaracion BETWEEN fecha_apertura AND fecha_cierre)
    AND (fecha_limitacion_mypymes IS NULL OR fecha_limitacion_mypymes BETWEEN fecha_apertura AND fecha_cierre)
  )
);
