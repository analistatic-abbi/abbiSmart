-- Usuario administrador inicial (solo desarrollo / primer arranque).
-- Correo: admin@abbi.com | Contraseña: Admin1234
INSERT IGNORE INTO usuarios (nombre, correo, password_hash, rol, pais_id, estado)
VALUES (
    'Administrador ABBI',
    'admin@abbi.com',
    '$2b$12$k7Nx3Fn4A6hitC72U4C18eaw9d5UOjl5gdCHTVwT8uukqBFt18u2i',
    'Administrador',
    NULL,
    'Activo'
);
