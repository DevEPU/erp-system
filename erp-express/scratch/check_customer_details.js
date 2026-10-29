const db = require('../src/config/db');

async function run() {
  try {
    const [tipe] = await db.query('SELECT * FROM tipe_customer LIMIT 100');
    console.log('=== TIPE_CUSTOMER ===');
    console.table(tipe);

    const [po] = await db.query('SELECT * FROM customer_po LIMIT 10');
    console.log('=== CUSTOMER_PO ===');
    console.table(po);

    const [forecasts] = await db.query('SELECT * FROM customer_forecasts LIMIT 10');
    console.log('=== CUSTOMER_FORECASTS ===');
    console.table(forecasts);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
