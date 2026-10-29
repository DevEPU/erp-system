const db = require('../src/config/db');
const fs = require('fs');

async function run() {
  try {
    const [tables] = await db.execute("SHOW TABLES");
    console.log("Database tables:", tables.map(t => Object.values(t)[0]));

    // Check machine_mold_uph
    const [mmu] = await db.execute(`
      SELECT mmu.*, m.code as machine_code, m.name as machine_name, mo.code as mold_code, mo.name as mold_name, p.product_code, p.product_name
      FROM machine_mold_uph mmu
      LEFT JOIN machines m ON m.id = mmu.machine_id
      LEFT JOIN molds mo ON mo.id = mmu.mold_id
      LEFT JOIN products p ON p.id = mmu.product_id
    `);
    console.log(`\n=== machine_mold_uph (${mmu.length} rows) ===`);
    console.log(mmu.slice(0, 10));

    // Check molds table
    const [molds] = await db.execute("SELECT * FROM molds LIMIT 20");
    console.log(`\n=== molds (${molds.length} rows) ===`);
    console.log(molds.slice(0, 10));

    // Check routings table if exists
    try {
      const [routings] = await db.execute("SELECT * FROM routings LIMIT 20");
      console.log(`\n=== routings (${routings.length} rows) ===`, routings.slice(0, 10));
    } catch (e) {
      console.log("No routings table:", e.message);
    }

    // Check work_orders
    try {
      const [wo] = await db.execute("SELECT * FROM work_orders LIMIT 10");
      console.log(`\n=== work_orders (${wo.length} rows) ===`, wo.slice(0, 5));
    } catch (e) {
      console.log("No work_orders table:", e.message);
    }

    // Dump all MMU and Molds to scratch json for lookup
    fs.writeFileSync('scratch/db_mmu_dump.json', JSON.stringify({ mmu, molds }, null, 2));
    console.log("Saved db_mmu_dump.json");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
