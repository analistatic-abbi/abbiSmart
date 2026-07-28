/**
 * Crea o actualiza usuarios demo de desarrollo (un usuario por rol).
 * Idempotente por correo.
 *
 * Ejecutar: npm run seed:demo-users
 */
import * as dotenv from 'dotenv';
import * as mariadb from 'mariadb';
import * as bcrypt from 'bcrypt';

dotenv.config();

const DEMO_PASSWORD = 'Admin1234';
const PASSWORD_HASH =
  '$2b$12$k7Nx3Fn4A6hitC72U4C18eaw9d5UOjl5gdCHTVwT8uukqBFt18u2i';

interface DemoUser {
  nombre: string;
  correo: string;
  rol: string;
  paisId: number | null;
}

const DEMO_USERS: DemoUser[] = [
  {
    nombre: 'Administrador ABBI',
    correo: 'admin@abbi.com',
    rol: 'Administrador',
    paisId: null,
  },
  {
    nombre: 'Supervisor Demo',
    correo: 'supervisor@abbi.com',
    rol: 'Supervisor del Sistema',
    paisId: null,
  },
  {
    nombre: 'Validador Demo',
    correo: 'validador@abbi.com',
    rol: 'Validador',
    paisId: null,
  },
  {
    nombre: 'Visitante Demo',
    correo: 'visitante@abbi.com',
    rol: 'Visitante',
    paisId: null,
  },
  {
    nombre: 'Operador Colombia',
    correo: 'operador.co@abbi.com',
    rol: 'Operador',
    paisId: 1,
  },
  {
    nombre: 'Operador Perú',
    correo: 'operador.pe@abbi.com',
    rol: 'Operador',
    paisId: 2,
  },
];

async function main(): Promise<void> {
  const connection = await mariadb.createConnection({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number.parseInt(process.env.DB_PORT ?? '3306', 10),
    user: process.env.DB_USERNAME ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_DATABASE ?? 'licitaciones_abbi',
  });

  try {
    for (const user of DEMO_USERS) {
      const existing = await connection.query<Array<{ id: number }>>(
        'SELECT id FROM usuarios WHERE correo = ? AND eliminado = 0 LIMIT 1',
        [user.correo],
      );

      if (existing.length > 0) {
        await connection.query(
          `UPDATE usuarios
           SET nombre = ?, password_hash = ?, rol = ?, pais_id = ?, estado = 'Activo'
           WHERE id = ?`,
          [
            user.nombre,
            PASSWORD_HASH,
            user.rol,
            user.paisId,
            existing[0].id,
          ],
        );
        console.log(`✓ Usuario actualizado (${user.correo})`);
      } else {
        await connection.query(
          `INSERT INTO usuarios (nombre, correo, password_hash, rol, pais_id, estado)
           VALUES (?, ?, ?, ?, ?, 'Activo')`,
          [
            user.nombre,
            user.correo,
            PASSWORD_HASH,
            user.rol,
            user.paisId,
          ],
        );
        console.log(`✓ Usuario creado (${user.correo})`);
      }
    }

    const valid = await bcrypt.compare(DEMO_PASSWORD, PASSWORD_HASH);
    if (!valid) {
      throw new Error('El hash demo no coincide con Admin1234');
    }

    console.log('\nCredenciales demo (contraseña: Admin1234):');
    for (const user of DEMO_USERS) {
      const pais =
        user.paisId === 1
          ? ' [Colombia fijo]'
          : user.paisId === 2
            ? ' [Perú fijo]'
            : '';
      console.log(`  ${user.correo}${pais}`);
    }
  } finally {
    await connection.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
