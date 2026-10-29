const db = require('../src/config/db');

async function run() {
  try {
    const [customers] = await db.query('SELECT * FROM customers LIMIT 100');
    console.log('=== CUSTOMERS ===');
    console.table(customers);

    const [grup] = await db.query('SELECT * FROM grup_customer LIMIT 100');
    console.log('=== GRUP_CUSTOMER ===');
    console.table(grup);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
