-- Catálogo de países: código ISO y moneda
ALTER TABLE `paises`
  ADD COLUMN `codigo_iso` CHAR(2) NULL AFTER `nombre`,
  ADD COLUMN `codigo_moneda` VARCHAR(3) NULL AFTER `codigo_iso`;

UPDATE `paises` SET `codigo_iso` = 'CO', `codigo_moneda` = 'COP' WHERE `nombre` = 'Colombia';
UPDATE `paises` SET `codigo_iso` = 'PE', `codigo_moneda` = 'PEN' WHERE `nombre` IN ('Perú', 'Peru');

ALTER TABLE `paises`
  ADD UNIQUE KEY `uk_pais_codigo_iso` (`codigo_iso`);

-- Permitir monedas ISO 4217 en procesos
ALTER TABLE `procesos`
  MODIFY COLUMN `moneda` VARCHAR(3) NOT NULL;
