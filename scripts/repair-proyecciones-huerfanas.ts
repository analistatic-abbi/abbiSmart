/**
 * Repara procesos Adjudicados + Periódicos (no RFI) que no tienen proyección asociada.
 * Uso: npx ts-node scripts/repair-proyecciones-huerfanas.ts [--dry-run]
 */
import { DataSource } from 'typeorm';
import dataSource from '../src/database/data-source';

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const ds = await dataSource.initialize();

  try {
    const rows = await ds.query(
      `SELECT p.id, p.codigo, p.id_digitado
       FROM procesos p
       LEFT JOIN proyecciones py
         ON py.proceso_origen_id = p.id AND py.eliminado = FALSE
       WHERE p.eliminado = FALSE
         AND p.estado = 'Adjudicado'
         AND p.tipo_proceso = 'Periódico'
         AND p.tipo_instrumento <> 'RFI'
         AND py.id IS NULL`,
    );

    console.log(`Procesos huérfanos encontrados: ${rows.length}`);

    if (dryRun) {
      for (const row of rows as Array<{ id: number; codigo: string | null }>) {
        console.log(`  - proceso #${row.id} (${row.codigo ?? 'sin código'})`);
      }
      return;
    }

    for (const row of rows as Array<{ id: number }>) {
      const procesoId = Number(row.id);
      const calcRows = await ds.query(
        `SELECT fecha_finalizacion AS fechaFinalizacion
         FROM vista_procesos_calculado WHERE id = ?`,
        [procesoId],
      );
      const fechaFinalizacion = calcRows[0]?.fechaFinalizacion;
      if (!fechaFinalizacion) {
        console.warn(`  omitido #${procesoId}: sin fecha_finalizacion`);
        continue;
      }

      const fecha =
        fechaFinalizacion instanceof Date
          ? fechaFinalizacion.toISOString().slice(0, 10)
          : String(fechaFinalizacion).slice(0, 10);
      const anio = Number(fecha.slice(0, 4));

      const proceso = await ds.query(
        `SELECT pais_id AS paisId, cuantia FROM procesos WHERE id = ?`,
        [procesoId],
      );
      const { paisId, cuantia } = proceso[0];

      const insert = await ds.query(
        `INSERT INTO proyecciones (
           proceso_origen_id, pais_id, anio_proyectado, fecha_estimada_publicacion,
           valor_venta, valor_facturacion, estado, mercado, eliminado
         ) VALUES (?, ?, ?, ?, ?, ?, 'Lejano', NULL, FALSE)`,
        [procesoId, paisId, anio, fecha, cuantia, cuantia],
      );

      console.log(`  reparado proceso #${procesoId} → proyección #${insert.insertId}`);
    }
  } finally {
    await ds.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
