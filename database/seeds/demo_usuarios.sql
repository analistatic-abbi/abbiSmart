-- Usuarios demo de desarrollo (todos con contraseña Admin1234).
-- Hash bcrypt: $2b$12$k7Nx3Fn4A6hitC72U4C18eaw9d5UOjl5gdCHTVwT8uukqBFt18u2i
-- Cargar con: npm run seed:demo-users

INSERT IGNORE INTO usuarios (nombre, correo, password_hash, rol, pais_id, estado)
VALUES
    (
        'Administrador ABBI',
        'admin@abbi.com',
        '$2b$12$k7Nx3Fn4A6hitC72U4C18eaw9d5UOjl5gdCHTVwT8uukqBFt18u2i',
        'Administrador',
        NULL,
        'Activo'
    ),
    (
        'Supervisor Demo',
        'supervisor@abbi.com',
        '$2b$12$k7Nx3Fn4A6hitC72U4C18eaw9d5UOjl5gdCHTVwT8uukqBFt18u2i',
        'Supervisor del Sistema',
        NULL,
        'Activo'
    ),
    (
        'Validador Demo',
        'validador@abbi.com',
        '$2b$12$k7Nx3Fn4A6hitC72U4C18eaw9d5UOjl5gdCHTVwT8uukqBFt18u2i',
        'Validador',
        NULL,
        'Activo'
    ),
    (
        'Visitante Demo',
        'visitante@abbi.com',
        '$2b$12$k7Nx3Fn4A6hitC72U4C18eaw9d5UOjl5gdCHTVwT8uukqBFt18u2i',
        'Visitante',
        NULL,
        'Activo'
    ),
    (
        'Operador Colombia',
        'operador.co@abbi.com',
        '$2b$12$k7Nx3Fn4A6hitC72U4C18eaw9d5UOjl5gdCHTVwT8uukqBFt18u2i',
        'Operador',
        (SELECT id FROM paises WHERE nombre = 'Colombia' LIMIT 1),
        'Activo'
    ),
    (
        'Operador Perú',
        'operador.pe@abbi.com',
        '$2b$12$k7Nx3Fn4A6hitC72U4C18eaw9d5UOjl5gdCHTVwT8uukqBFt18u2i',
        'Operador',
        (SELECT id FROM paises WHERE nombre = 'Perú' LIMIT 1),
        'Activo'
    );
