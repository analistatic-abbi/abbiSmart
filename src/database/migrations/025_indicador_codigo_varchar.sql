ALTER TABLE `parametros_financieros`
  MODIFY COLUMN `indicador_codigo` VARCHAR(50) NOT NULL;

ALTER TABLE `proceso_indicadores`
  MODIFY COLUMN `indicador_codigo` VARCHAR(50) NOT NULL;

ALTER TABLE `proceso_calificacion_detalle`
  MODIFY COLUMN `indicador_codigo` VARCHAR(50) NOT NULL;
