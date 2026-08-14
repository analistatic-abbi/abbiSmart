-- Permitir fijar KAMs en la bandeja personal
-- Ejecutar: Get-Content src\database\migrations\036_usuario_fijaciones_kam.sql | docker exec -i smartlicitaciones-back-mariadb-1 mariadb -uroot -prootpassword licitaciones_abbi

ALTER TABLE usuario_fijaciones
  MODIFY COLUMN entidad_tipo ENUM('proceso', 'proyeccion', 'relacionamiento', 'kam') NOT NULL;
