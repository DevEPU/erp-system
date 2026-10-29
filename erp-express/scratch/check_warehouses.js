const db = require('../src/config/db');

async function run() {
  try {
    const [warehouses] = await db.query('SELECT * FROM warehouses');
    console.log('=== WAREHOUSES ===');
    console.table(warehouses);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
