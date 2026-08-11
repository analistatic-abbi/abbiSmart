SET @co_id = (SELECT id FROM paises WHERE codigo_iso = 'CO' OR nombre = 'Colombia' LIMIT 1);
SET @bogota = CONVERT(UNHEX('426F676F74C3A1') USING utf8mb4);
SET @cundinamarca = CONVERT(UNHEX('43756E64696E616D61726361') USING utf8mb4);

DELETE FROM ubicaciones_geograficas
WHERE pais_id = @co_id
  AND departamento = @cundinamarca
  AND municipio_provincia NOT IN (@bogota)
  AND municipio_provincia LIKE 'Bogot%';

INSERT IGNORE INTO ubicaciones_geograficas (pais_id, departamento, municipio_provincia)
VALUES (@co_id, @cundinamarca, @bogota);

SET @bogota_cundinamarca_id = (
  SELECT id
  FROM ubicaciones_geograficas
  WHERE pais_id = @co_id
    AND departamento = @cundinamarca
    AND municipio_provincia = @bogota
  LIMIT 1
);

UPDATE clientes c
JOIN ubicaciones_geograficas u ON u.id = c.ubicacion_id
SET c.ubicacion_id = @bogota_cundinamarca_id
WHERE u.pais_id = @co_id
  AND u.departamento = CONVERT(UNHEX('426F676F74C3A120442E432E') USING utf8mb4);

UPDATE procesos p
JOIN ubicaciones_geograficas u ON u.id = p.ubicacion_id
SET p.ubicacion_id = @bogota_cundinamarca_id
WHERE u.pais_id = @co_id
  AND u.departamento = CONVERT(UNHEX('426F676F74C3A120442E432E') USING utf8mb4);

UPDATE contactos c
JOIN ubicaciones_geograficas u ON u.id = c.ubicacion_id
SET c.ubicacion_id = @bogota_cundinamarca_id
WHERE u.pais_id = @co_id
  AND u.departamento = CONVERT(UNHEX('426F676F74C3A120442E432E') USING utf8mb4);

DELETE u
FROM ubicaciones_geograficas u
WHERE u.pais_id = @co_id
  AND u.departamento = CONVERT(UNHEX('426F676F74C3A120442E432E') USING utf8mb4);

UPDATE ubicaciones_geograficas
SET departamento = @cundinamarca,
    municipio_provincia = @bogota
WHERE pais_id = @co_id
  AND departamento = @cundinamarca
  AND municipio_provincia = CONVERT(UNHEX('426F676F74C3A120442E432E') USING utf8mb4);
