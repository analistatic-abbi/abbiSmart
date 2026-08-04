-- Gradación de resultado de indicadores (4 niveles) y margen configurable.
-- Ejecutar: Get-Content src\database\migrations\016_indicador_gradacion.sql | docker exec -i smartlicitaciones-back-mariadb-1 mariadb -uroot -prootpassword licitaciones_abbi

ALTER TABLE proceso_indicadores
  MODIFY cumple ENUM(
    'Cumple',
    'No Cumple',
    'Aprobado',
    'Casi Aprobado',
    'Casi Desaprobado',
    'No Aprobado'
  ) DEFAULT NULL;

UPDATE proceso_indicadores
SET cumple = CASE cumple
  WHEN 'Cumple' THEN 'Aprobado'
  WHEN 'No Cumple' THEN 'No Aprobado'
  ELSE cumple
END
WHERE cumple IS NOT NULL;

ALTER TABLE proceso_indicadores
  MODIFY cumple ENUM(
    'Aprobado',
    'Casi Aprobado',
    'Casi Desaprobado',
    'No Aprobado'
  ) DEFAULT NULL;

INSERT INTO configuracion_sistema (clave, valor, descripcion)
VALUES (
  'indicador_margen_casi_pct',
  '5',
  'Margen % para zonas Casi Aprobado / Casi Desaprobado en evaluación de indicadores'
)
ON DUPLICATE KEY UPDATE
  descripcion = VALUES(descripcion);
