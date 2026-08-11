/**
 * Repara procesos Adjudicados con cliente formal que no tienen KAM asociado.
 * Uso: npx ts-node scripts/repair-kams-huerfanos.ts [--dry-run]
 */
import dataSource from '../src/database/data-source';

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const ds = await dataSource.initialize();

  try {
    const rows = await ds.query(
      `SELECT p.id, p.codigo, p.id_digitado, p.empresa_cliente_id AS empresaClienteId
       FROM procesos p
       LEFT JOIN kams k ON k.proceso_id = p.id
       WHERE p.eliminado = FALSE
         AND p.estado = 'Adjudicado'
         AND p.empresa_cliente_id IS NOT NULL
         AND k.id IS NULL`,
    );

    console.log(`Procesos adjudicados sin KAM encontrados: ${rows.length}`);

    if (dryRun) {
      for (const row of rows as Array<{ id: number; codigo: string | null }>) {
        console.log(`  - proceso #${row.id} (${row.codigo ?? 'sin código'})`);
      }
      return;
    }

    for (const row of rows as Array<{
      id: number;
      empresaClienteId: number;
    }>) {
      const procesoId = Number(row.id);
      const proceso = await ds.query(
        `SELECT pais_id AS paisId FROM procesos WHERE id = ?`,
        [procesoId],
      );
      const { paisId } = proceso[0];

      const insert = await ds.query(
        `INSERT INTO kams (proceso_id, pais_id, empresa_cliente_id, creado_por_id)
         VALUES (?, ?, ?, NULL)`,
        [procesoId, paisId, row.empresaClienteId],
      );

      const kamId = Number(insert.insertId);
      await ds.query(
        `INSERT INTO kam_rondas (kam_id, numero, estado) VALUES (?, 1, 'Pendiente')`,
        [kamId],
      );

      console.log(`  reparado proceso #${procesoId} → KAM #${kamId} + ronda 1`);
    }

    const kamsSinRonda = await ds.query(
      `SELECT k.id
       FROM kams k
       WHERE NOT EXISTS (SELECT 1 FROM kam_rondas r WHERE r.kam_id = k.id)`,
    );

    for (const row of kamsSinRonda as Array<{ id: number }>) {
      const kamId = Number(row.id);
      await ds.query(
        `INSERT INTO kam_rondas (kam_id, numero, estado) VALUES (?, 1, 'Pendiente')`,
        [kamId],
      );
      console.log(`  ronda 1 creada para KAM #${kamId}`);
    }
  } finally {
    await ds.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
