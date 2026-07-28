-- Evidencias de tareas: soporte de archivo adjunto
ALTER TABLE proceso_tareas
  ADD COLUMN IF NOT EXISTS evidencia_archivo_nombre VARCHAR(255) NULL AFTER evidencia,
  ADD COLUMN IF NOT EXISTS evidencia_archivo_ruta VARCHAR(500) NULL AFTER evidencia_archivo_nombre;

ALTER TABLE proceso_tareas DROP CONSTRAINT IF EXISTS chk_tarea_requiere_evidencia;
ALTER TABLE proceso_tareas
  ADD CONSTRAINT chk_tarea_requiere_evidencia CHECK (
    completada = FALSE
    OR evidencia IS NOT NULL
    OR evidencia_archivo_nombre IS NOT NULL
  );
