-- Eliminar fecha_programada de rondas KAM (la única fecha es reunión de fin de ronda)
ALTER TABLE kam_rondas DROP COLUMN fecha_programada;

-- Crear ronda 1 para KAMs existentes sin rondas
INSERT INTO kam_rondas (kam_id, numero, estado)
SELECT k.id, 1, 'Pendiente'
FROM kams k
WHERE NOT EXISTS (
  SELECT 1 FROM kam_rondas r WHERE r.kam_id = k.id
);
