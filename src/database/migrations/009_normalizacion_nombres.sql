ALTER TABLE clientes
  ADD COLUMN empresa_normalizada VARCHAR(255) NOT NULL DEFAULT '' AFTER empresa,
  ADD INDEX idx_clientes_empresa_normalizada (pais_id, empresa_normalizada);

ALTER TABLE contactos
  ADD COLUMN nombre_normalizado VARCHAR(255) NOT NULL DEFAULT '' AFTER nombre,
  ADD INDEX idx_contactos_nombre_normalizado (nombre_normalizado);

UPDATE clientes
SET empresa_normalizada = LOWER(TRIM(empresa))
WHERE empresa_normalizada = '';

UPDATE contactos
SET nombre_normalizado = LOWER(TRIM(nombre))
WHERE nombre_normalizado = '';
