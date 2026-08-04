-- Persistir año de parámetros ABBI elegido al crear el proceso.
-- Ejecutar: Get-Content src\database\migrations\019_proceso_anio_parametros.sql | docker exec -i smartlicitaciones-back-mariadb-1 mariadb -uroot -prootpassword licitaciones_abbi

ALTER TABLE procesos
  ADD COLUMN anio_parametros SMALLINT UNSIGNED NULL AFTER validadores_asignado_por_id;

UPDATE procesos p
SET anio_parametros = (
  SELECT pf.anio
  FROM proceso_indicadores pi
  INNER JOIN parametros_financieros pf ON pf.id = pi.parametro_financiero_id
  WHERE pi.proceso_id = p.id
    AND pi.parametro_financiero_id IS NOT NULL
  ORDER BY pi.id
  LIMIT 1
)
WHERE p.anio_parametros IS NULL;

UPDATE procesos
SET anio_parametros = YEAR(CURDATE()) - 1
WHERE anio_parametros IS NULL;

ALTER TABLE procesos
  MODIFY anio_parametros SMALLINT UNSIGNED NOT NULL;
