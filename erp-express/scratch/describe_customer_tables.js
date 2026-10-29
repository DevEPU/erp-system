const db = require('../src/config/db');

async function run() {
  try {
    const tables = ['customer_po_details', 'customer_forecast_details'];
    for (const tbl of tables) {
      const [desc] = await db.query(`DESCRIBE ${tbl}`);
      console.log(`\n=== Definition for ${tbl} ===`);
      desc.forEach(c => console.log(`${c.Field} - ${c.Type}`));
    }
  } catch (e) {
    console.error(e.message);
  } finally {
    process.exit(0);
  }
}

run();
