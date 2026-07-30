-- El año de reporte se toma del año calendario actual (YEAR(CURDATE())).
-- Ejecutar: docker exec -i smartlicitaciones-back-mariadb-1 mariadb -uroot -prootpassword licitaciones_abbi < src/database/migrations/010_anio_reporte_dinamico.sql

DROP VIEW IF EXISTS vista_procesos_calculado;

CREATE VIEW vista_procesos_calculado AS
SELECT
    p.id,
    p.codigo,
    pa.nombre AS pais,
    p.estado,
    p.segmento,
    p.cuantia,
    p.plazo_ejecucion_meses,
    p.fecha_cierre,
    p.fecha_inicio_ejecucion,
    p.fecha_finalizacion,
    COALESCE(c.empresa, p.empresa_otro) AS empresa_mostrar,
    DATEDIFF(p.fecha_finalizacion, CURDATE()) AS dias_espera,
    CONCAT(DATE_FORMAT(p.fecha_finalizacion, '%M'), '-', DATE_FORMAT(p.fecha_finalizacion, '%y')) AS fecha_esperada,
    DATEDIFF(p.fecha_cierre, CURDATE()) AS dias_restantes_cierre,
    YEAR(CURDATE()) AS anio_reporte,
    GREATEST(0, TIMESTAMPDIFF(MONTH,
        GREATEST(p.fecha_inicio_ejecucion, MAKEDATE(YEAR(CURDATE()), 1)),
        LEAST(p.fecha_finalizacion, MAKEDATE(YEAR(CURDATE()) + 1, 1))
    )) AS meses_ejecucion_anio_reporte,
    ROUND(
        (p.cuantia / p.plazo_ejecucion_meses) *
        GREATEST(0, TIMESTAMPDIFF(MONTH,
            GREATEST(p.fecha_inicio_ejecucion, MAKEDATE(YEAR(CURDATE()), 1)),
            LEAST(p.fecha_finalizacion, MAKEDATE(YEAR(CURDATE()) + 1, 1))
        ))
    , 2) AS facturacion_estimada_anio_reporte
FROM procesos p
JOIN paises pa ON pa.id = p.pais_id
LEFT JOIN clientes c ON c.id = p.empresa_cliente_id
WHERE p.eliminado = FALSE;

DELETE FROM configuracion_sistema WHERE clave = 'anio_reporte_vigente';
