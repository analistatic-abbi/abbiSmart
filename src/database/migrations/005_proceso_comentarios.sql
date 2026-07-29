-- Bitácora de comentarios internos por proceso (append-only)
CREATE TABLE IF NOT EXISTS proceso_comentarios (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    proceso_id      BIGINT UNSIGNED NOT NULL,
    usuario_id      BIGINT UNSIGNED NOT NULL,
    texto           TEXT NOT NULL,
    fecha_creacion  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_proceso_comentario_proceso FOREIGN KEY (proceso_id) REFERENCES procesos(id),
    CONSTRAINT fk_proceso_comentario_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    INDEX idx_proceso_comentario_proceso (proceso_id, fecha_creacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
