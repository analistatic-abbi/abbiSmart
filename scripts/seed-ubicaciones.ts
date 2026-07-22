/**
 * Carga database/seeds/ubicaciones_geograficas.sql en MariaDB.
 * Idempotente: usa INSERT IGNORE sobre uk_ubicacion.
 *
 * Ejecutar: npm run seed:ubicaciones
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as dotenv from 'dotenv';
import * as mariadb from 'mariadb';

dotenv.config();

async function main(): Promise<void> {
  const sqlPath = join(
    __dirname,
    '..',
    'database',
    'seeds',
    'ubicaciones_geograficas.sql',
  );

  const sql = readFileSync(sqlPath, 'utf8');
  const host = process.env.DB_HOST ?? 'localhost';
  const port = Number.parseInt(process.env.DB_PORT ?? '3306', 10);
  const user = process.env.DB_USERNAME ?? 'root';
  const password = process.env.DB_PASSWORD ?? '';
  const database = process.env.DB_DATABASE ?? 'licitaciones_abbi';

  const connection = await mariadb.createConnection({
    host,
    port,
    user,
    password,
    database,
    multipleStatements: true,
  });

  try {
    await connection.query(sql);

    const counts = await connection.query<
      Array<{ pais: string; total: number | bigint }>
    >(
      `SELECT p.nombre AS pais, COUNT(u.id) AS total
       FROM paises p
       LEFT JOIN ubicaciones_geograficas u ON u.pais_id = p.id
       GROUP BY p.id, p.nombre
       ORDER BY p.id`,
    );

    console.log('✓ Seed de ubicaciones cargado correctamente');
    for (const row of counts) {
      console.log(`  ${row.pais}: ${row.total} registros`);
    }
  } finally {
    await connection.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
