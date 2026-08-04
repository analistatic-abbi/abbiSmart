-- Campo objeto en procesos y proyecciones (puntos 12-14)
-- Ejecutar: Get-Content src\database\migrations\014_objeto_procesos_proyecciones.sql | docker exec -i smartlicitaciones-back-mariadb-1 mariadb -uroot -prootpassword licitaciones_abbi

ALTER TABLE procesos
  ADD COLUMN objeto VARCHAR(500) NULL AFTER link;

ALTER TABLE proyecciones
  ADD COLUMN objeto VARCHAR(500) NULL AFTER valor_facturacion;
