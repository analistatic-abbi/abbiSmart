ALTER TABLE procesos
  ADD COLUMN motivo_perdida VARCHAR(80) NULL AFTER observacion,
  ADD COLUMN motivo_perdida_otro TEXT NULL AFTER motivo_perdida,
  ADD COLUMN motivo_perdida_registrado_en DATETIME NULL AFTER motivo_perdida_otro,
  ADD COLUMN motivo_perdida_usuario_id BIGINT UNSIGNED NULL AFTER motivo_perdida_registrado_en,
  ADD COLUMN fue_adjudicado BOOLEAN NOT NULL DEFAULT FALSE AFTER motivo_perdida_usuario_id,
  ADD INDEX idx_procesos_motivo_perdida (motivo_perdida),
  ADD CONSTRAINT fk_proceso_motivo_usuario
    FOREIGN KEY (motivo_perdida_usuario_id) REFERENCES usuarios(id);

UPDATE procesos p
SET p.fue_adjudicado = TRUE
WHERE EXISTS (
  SELECT 1
  FROM log_auditoria la
  WHERE la.entidad_tipo = 'proceso'
    AND la.entidad_id = p.id
    AND la.accion = 'proceso_cambiar_estado'
    AND la.valor_nuevo LIKE '%"estado":"Adjudicado"%'
);

UPDATE procesos p
SET p.fue_adjudicado = TRUE
WHERE p.estado = 'Adjudicado';
