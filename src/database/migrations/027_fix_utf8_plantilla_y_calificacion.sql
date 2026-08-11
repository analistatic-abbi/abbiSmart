-- Corrige nombres de plantilla con encoding corrupto (??) y reactiva calificación por puntos en Colombia.
SET NAMES utf8mb4;

UPDATE plantilla_tarea_pais SET nombre = 'Creación de carpeta' WHERE codigo = 'Creacion_Carpeta';
UPDATE plantilla_tarea_pais SET nombre = 'Manifestación de interés' WHERE codigo = 'Manifestacion_Interes';
UPDATE plantilla_tarea_pais SET nombre = 'Adquisición derecho a participar' WHERE codigo = 'Adquisicion_Derecho_Participar';
UPDATE plantilla_tarea_pais SET nombre = 'Preparar documentación jurídica' WHERE codigo = 'Preparar_Doc_Juridica';
UPDATE plantilla_tarea_pais SET nombre = 'Preparar documentación técnica' WHERE codigo = 'Preparar_Doc_Tecnica';
UPDATE plantilla_tarea_pais SET nombre = 'Preparar documentación financiera' WHERE codigo = 'Preparar_Doc_Financiera';
UPDATE plantilla_tarea_pais SET nombre = 'Estructuración de administración' WHERE codigo = 'Estructuracion_Administracion';
UPDATE plantilla_tarea_pais SET nombre = 'Solicitud de pago de póliza' WHERE codigo = 'Solicitud_Pago_Poliza';
UPDATE plantilla_tarea_pais SET nombre = 'Pago de póliza' WHERE codigo = 'Pago_Poliza';
UPDATE plantilla_tarea_pais SET nombre = 'Elaboración de propuesta económica' WHERE codigo = 'Elaboracion_Propuesta_Economica';
UPDATE plantilla_tarea_pais SET nombre = 'Validación área técnica' WHERE codigo = 'Validacion_Area_Tecnica';
UPDATE plantilla_tarea_pais SET nombre = 'Envío de propuesta' WHERE codigo = 'Envio_Propuesta';

UPDATE configuracion_pais cp
INNER JOIN paises p ON p.id = cp.pais_id
SET cp.valor = 'true'
WHERE cp.clave = 'calificacion_por_puntos_habilitada'
  AND UPPER(p.codigo_iso) = 'CO';
