-- Registra quién asignó validadores al proceso (para notificar en devolución).
-- Ejecutar: Get-Content src\database\migrations\014_proceso_validadores_asignado_por.sql | docker exec -i smartlicitaciones-back-mariadb-1 mariadb -uroot -prootpassword licitaciones_abbi

ALTER TABLE procesos
  ADD COLUMN validadores_asignado_por_id BIGINT UNSIGNED NULL AFTER usuario_creador_id,
  ADD KEY idx_proceso_validadores_asignado_por (validadores_asignado_por_id),
  ADD CONSTRAINT fk_proceso_validadores_asignado_por
    FOREIGN KEY (validadores_asignado_por_id) REFERENCES usuarios (id);
