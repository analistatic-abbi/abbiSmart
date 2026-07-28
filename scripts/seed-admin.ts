/**
 * Crea o actualiza el usuario administrador de desarrollo.
 * Idempotente: correo admin@abbi.com
 *
 * Ejecutar: npm run seed:admin
 */
import * as dotenv from 'dotenv';
import * as mariadb from 'mariadb';
import * as bcrypt from 'bcrypt';

dotenv.config();

const ADMIN_CORREO = 'admin@abbi.com';
const ADMIN_PASSWORD = 'Admin1234';
const ADMIN_NOMBRE = 'Administrador ABBI';
const PASSWORD_HASH =
  '$2b$12$k7Nx3Fn4A6hitC72U4C18eaw9d5UOjl5gdCHTVwT8uukqBFt18u2i';

async function main(): Promise<void> {
  const connection = await mariadb.createConnection({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number.parseInt(process.env.DB_PORT ?? '3306', 10),
    user: process.env.DB_USERNAME ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_DATABASE ?? 'licitaciones_abbi',
  });

  try {
    const existing = await connection.query<Array<{ id: number }>>(
      'SELECT id FROM usuarios WHERE correo = ? AND eliminado = 0 LIMIT 1',
      [ADMIN_CORREO],
    );

    if (existing.length > 0) {
      await connection.query(
        `UPDATE usuarios
         SET nombre = ?, password_hash = ?, rol = 'Administrador', estado = 'Activo', pais_id = NULL
         WHERE id = ?`,
        [ADMIN_NOMBRE, PASSWORD_HASH, existing[0].id],
      );
      console.log(`✓ Administrador actualizado (${ADMIN_CORREO})`);
    } else {
      await connection.query(
        `INSERT INTO usuarios (nombre, correo, password_hash, rol, pais_id, estado)
         VALUES (?, ?, ?, 'Administrador', NULL, 'Activo')`,
        [ADMIN_NOMBRE, ADMIN_CORREO, PASSWORD_HASH],
      );
      console.log(`✓ Administrador creado (${ADMIN_CORREO})`);
    }

    const valid = await bcrypt.compare(ADMIN_PASSWORD, PASSWORD_HASH);
    if (!valid) {
      throw new Error('El hash del administrador no coincide con Admin1234');
    }

    console.log('  Credenciales de desarrollo:');
    console.log(`  Correo: ${ADMIN_CORREO}`);
    console.log(`  Contraseña: ${ADMIN_PASSWORD}`);
  } finally {
    await connection.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
