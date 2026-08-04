-- Vincula el contacto creado por un relacionamiento "Referido a tercero".
-- Ejecutar: Get-Content src\database\migrations\013_relacionamiento_contacto_referido.sql | docker exec -i smartlicitaciones-back-mariadb-1 mariadb -uroot -prootpassword licitaciones_abbi

ALTER TABLE relacionamientos
  ADD COLUMN contacto_referido_id BIGINT UNSIGNED NULL AFTER fecha_reunion,
  ADD KEY idx_relacionamiento_contacto_referido (contacto_referido_id),
  ADD CONSTRAINT fk_relacionamiento_contacto_referido
    FOREIGN KEY (contacto_referido_id) REFERENCES contactos (id);
