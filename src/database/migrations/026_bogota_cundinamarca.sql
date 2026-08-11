-- Bogotá bajo Cundinamarca (Colombia): deja de existir como departamento propio
SET @co_id = (SELECT id FROM paises WHERE codigo_iso = 'CO' OR nombre = 'Colombia' LIMIT 1);

INSERT IGNORE INTO ubicaciones_geograficas (pais_id, departamento, municipio_provincia)
VALUES (@co_id, 'Cundinamarca', 'Bogotá');

SET @bogota_cundinamarca_id = (
  SELECT id
  FROM ubicaciones_geograficas
  WHERE pais_id = @co_id
    AND departamento = 'Cundinamarca'
    AND municipio_provincia = 'Bogotá'
  LIMIT 1
);

UPDATE clientes c
JOIN ubicaciones_geograficas u ON u.id = c.ubicacion_id
SET c.ubicacion_id = @bogota_cundinamarca_id
WHERE u.pais_id = @co_id
  AND (
    u.departamento = 'Bogotá D.C.'
    OR (u.departamento = 'Cundinamarca' AND u.municipio_provincia IN ('Bogotá D.C.', 'Bogota', 'Bogota DC'))
  );

UPDATE procesos p
JOIN ubicaciones_geograficas u ON u.id = p.ubicacion_id
SET p.ubicacion_id = @bogota_cundinamarca_id
WHERE u.pais_id = @co_id
  AND (
    u.departamento = 'Bogotá D.C.'
    OR (u.departamento = 'Cundinamarca' AND u.municipio_provincia IN ('Bogotá D.C.', 'Bogota', 'Bogota DC'))
  );

UPDATE contactos c
JOIN ubicaciones_geograficas u ON u.id = c.ubicacion_id
SET c.ubicacion_id = @bogota_cundinamarca_id
WHERE u.pais_id = @co_id
  AND (
    u.departamento = 'Bogotá D.C.'
    OR (u.departamento = 'Cundinamarca' AND u.municipio_provincia IN ('Bogotá D.C.', 'Bogota', 'Bogota DC'))
  );

DELETE u
FROM ubicaciones_geograficas u
WHERE u.pais_id = @co_id
  AND (
    u.departamento = 'Bogotá D.C.'
    OR (u.departamento = 'Cundinamarca' AND u.municipio_provincia IN ('Bogotá D.C.', 'Bogota', 'Bogota DC'))
  );

UPDATE ubicaciones_geograficas
SET departamento = 'Cundinamarca',
    municipio_provincia = 'Bogotá'
WHERE pais_id = @co_id
  AND departamento = 'Cundinamarca'
  AND municipio_provincia = 'Bogotá D.C.';
