CREATE TABLE IF NOT EXISTS reportes_generados (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tipo            VARCHAR(50) NOT NULL,
    periodo         CHAR(7) NOT NULL,
    pais_id         BIGINT UNSIGNED NOT NULL,
    nombre_archivo  VARCHAR(255) NOT NULL,
    ruta_archivo    VARCHAR(500) NOT NULL,
    tamano_bytes    INT UNSIGNED NOT NULL DEFAULT 0,
    generado_en     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    generado_por    VARCHAR(20) NOT NULL DEFAULT 'job_mensual',
    CONSTRAINT fk_reporte_pais FOREIGN KEY (pais_id) REFERENCES paises(id),
    UNIQUE KEY uk_reporte_periodo (tipo, periodo, pais_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
