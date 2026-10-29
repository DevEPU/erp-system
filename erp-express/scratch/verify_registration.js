const db = require('../src/config/db');

async function main() {
  const [machines] = await db.query(
    'SELECT id, code, name, capacity, line, status, standard_mp, leader_group FROM machines ORDER BY CAST(SUBSTRING(code, 4) AS UNSIGNED) ASC'
  );
  console.log(`--- REGISTERED MACHINES (Total: ${machines.length}) ---`);
  console.table(machines);

  const [uphSample] = await db.query(`
    SELECT mmu.id, m.code as mc_code, mo.name as mold_name, p.product_code, p.product_name, mmu.uph, mmu.is_primary
    FROM machine_mold_uph mmu
    JOIN machines m ON mmu.machine_id = m.id
    JOIN molds mo ON mmu.mold_id = mo.id
    JOIN products p ON mmu.product_id = p.id
    ORDER BY CAST(SUBSTRING(m.code, 4) AS UNSIGNED) ASC, mmu.uph DESC
    LIMIT 20
  `);
  console.log('--- SAMPLE MACHINE-MOLD-UPH MAPPINGS ---');
  console.table(uphSample);

  // Group by tonnage to compare with image
  const [byTon] = await db.query(`
    SELECT capacity, COUNT(*) as count 
    FROM machines 
    WHERE is_active = 1 
    GROUP BY capacity 
    ORDER BY CAST(REPLACE(capacity, ' Ton', '') AS UNSIGNED) ASC
  `);
  console.log('--- MACHINES BY TONNAGE ---');
  console.table(byTon);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
