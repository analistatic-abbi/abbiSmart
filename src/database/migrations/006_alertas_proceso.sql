-- Extender control de alertas para procesos (cierre próximo)
ALTER TABLE alertas_enviadas
  ADD COLUMN proceso_id BIGINT UNSIGNED NULL AFTER relacionamiento_id;

ALTER TABLE alertas_enviadas
  ADD CONSTRAINT fk_alerta_proceso FOREIGN KEY (proceso_id) REFERENCES procesos(id);

ALTER TABLE alertas_enviadas
  DROP CONSTRAINT chk_alerta_exactamente_una_entidad;

ALTER TABLE alertas_enviadas
  ADD CONSTRAINT chk_alerta_exactamente_una_entidad CHECK (
    (proyeccion_id IS NOT NULL AND relacionamiento_id IS NULL AND proceso_id IS NULL)
    OR (proyeccion_id IS NULL AND relacionamiento_id IS NOT NULL AND proceso_id IS NULL)
    OR (proyeccion_id IS NULL AND relacionamiento_id IS NULL AND proceso_id IS NOT NULL)
  );

ALTER TABLE alertas_enviadas
  ADD UNIQUE KEY uk_alerta_proceso (proceso_id, umbral);
