const db = require('../src/config/db');

async function main() {
  const [machines] = await db.query('SELECT * FROM machines');
  console.log('CURRENT MACHINES IN DB:', machines);

  const [molds] = await db.query('SELECT id, code, name FROM molds');
  console.log('CURRENT MOLDS IN DB (first 10):', molds.slice(0, 10));
  console.log(`Total Molds in DB: ${molds.length}`);

  const [moldProds] = await db.query('SELECT * FROM mold_products LIMIT 5');
  console.log('CURRENT MOLD_PRODUCTS IN DB (first 5):', moldProds);

  const [uphs] = await db.query('SELECT * FROM machine_mold_uph');
  console.log('CURRENT MACHINE_MOLD_UPH IN DB:', uphs);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
