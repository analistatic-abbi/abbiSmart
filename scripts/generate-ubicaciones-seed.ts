/**
 * Genera database/seeds/ubicaciones_geograficas.sql a partir de fuentes abiertas:
 * - Colombia: proyecto26/colombia (DANE / datos.gov.co)
 * - Perú: RitchieRD/ubigeos-peru-data (UBIGEO INEI 2024)
 *
 * Ejecutar: npm run seed:ubicaciones:generate
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const COLOMBIA_DEPARTMENTS_URL =
  'https://raw.githubusercontent.com/proyecto26/colombia/master/departments.json';
const COLOMBIA_CITIES_URL =
  'https://raw.githubusercontent.com/proyecto26/colombia/master/cities.json';
const PERU_DEPARTMENTS_URL =
  'https://raw.githubusercontent.com/RitchieRD/ubigeos-peru-data/main/json/1_ubigeo_departamentos.json';
const PERU_PROVINCES_URL =
  'https://raw.githubusercontent.com/RitchieRD/ubigeos-peru-data/main/json/2_ubigeo_provincias.json';
const PERU_DISTRICTS_URL =
  'https://raw.githubusercontent.com/RitchieRD/ubigeos-peru-data/main/json/3_ubigeo_distritos.json';

interface ColombiaDepartment {
  id: number;
  name: string;
}

interface ColombiaCity {
  id: number;
  name: string;
  departmentId: number;
}

interface PeruDepartment {
  id: number;
  departamento: string;
}

interface PeruProvince {
  id: number;
  provincia: string;
  departamento_id: number;
}

interface PeruDistrict {
  id: number;
  distrito: string;
  provincia_id: number;
  departamento_id: number;
}

function escapeSql(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "''");
}

function toTitleCase(value: string): string {
  const lower = value.toLowerCase();
  return lower.replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, char: string) => {
    return `${sep}${char.toUpperCase()}`;
  });
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`No se pudo descargar ${url}: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function main(): Promise<void> {
  const [coDepartmentsPayload, coCitiesPayload, peDepartmentsPayload, peProvincesPayload, peDistrictsPayload] =
    await Promise.all([
      fetchJson<{ data: ColombiaDepartment[] }>(COLOMBIA_DEPARTMENTS_URL),
      fetchJson<{ data: ColombiaCity[] }>(COLOMBIA_CITIES_URL),
      fetchJson<{ ubigeo_departamentos: PeruDepartment[] }>(PERU_DEPARTMENTS_URL),
      fetchJson<{ ubigeo_provincias: PeruProvince[] }>(PERU_PROVINCES_URL),
      fetchJson<{ ubigeo_distritos: PeruDistrict[] }>(PERU_DISTRICTS_URL),
    ]);

  const departmentById = new Map(
    coDepartmentsPayload.data.map((department) => [department.id, department.name]),
  );

  const peruDepartmentById = new Map(
    peDepartmentsPayload.ubigeo_departamentos.map((department) => [
      department.id,
      toTitleCase(department.departamento),
    ]),
  );

  const peruProvinceById = new Map(
    peProvincesPayload.ubigeo_provincias.map((province) => [
      province.id,
      toTitleCase(province.provincia),
    ]),
  );

  const rows: string[] = [];

  for (const city of coCitiesPayload.data) {
    const department = departmentById.get(city.departmentId);

    if (!department) {
      continue;
    }

    rows.push(
      `((SELECT id FROM paises WHERE nombre = 'Colombia'), '${escapeSql(department)}', '${escapeSql(city.name)}')`,
    );
  }

  for (const district of peDistrictsPayload.ubigeo_distritos) {
    const department = peruDepartmentById.get(district.departamento_id);
    const province = peruProvinceById.get(district.provincia_id);

    if (!department || !province) {
      continue;
    }

    const municipioProvincia = `${province} - ${toTitleCase(district.distrito)}`;

    rows.push(
      `((SELECT id FROM paises WHERE nombre = 'Perú'), '${escapeSql(department)}', '${escapeSql(municipioProvincia)}')`,
    );
  }

  const chunkSize = 200;
  const insertBlocks: string[] = [];

  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    insertBlocks.push(
      `INSERT IGNORE INTO ubicaciones_geograficas (pais_id, departamento, municipio_provincia)\nVALUES\n  ${chunk.join(',\n  ')};`,
    );
  }

  const sql = [
    '-- ============================================================================',
    '-- Seed: ubicaciones geográficas (Colombia + Perú)',
    '-- Generado con: npm run seed:ubicaciones:generate',
    '-- Cargar con: npm run seed:ubicaciones',
    '-- Fuentes:',
    '--   Colombia → https://github.com/proyecto26/colombia (DANE)',
    '--   Perú     → https://github.com/RitchieRD/ubigeos-peru-data (UBIGEO INEI)',
    '-- ============================================================================',
    '',
    'SET NAMES utf8mb4;',
    '',
    ...insertBlocks,
    '',
  ].join('\n');

  const outputDir = join(__dirname, '..', 'database', 'seeds');
  mkdirSync(outputDir, { recursive: true });

  const outputPath = join(outputDir, 'ubicaciones_geograficas.sql');
  writeFileSync(outputPath, sql, 'utf8');

  const colombiaCount = coCitiesPayload.data.length;
  const peruCount = peDistrictsPayload.ubigeo_distritos.length;

  console.log(`✓ Seed generado: ${outputPath}`);
  console.log(`  Colombia: ${colombiaCount} municipios`);
  console.log(`  Perú: ${peruCount} distritos (provincia - distrito)`);
  console.log(`  Total filas SQL: ${rows.length}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
