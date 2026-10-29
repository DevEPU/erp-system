const db = require('../src/config/db');

async function run() {
  try {
    const [poDetails] = await db.query('SELECT * FROM customer_po_details LIMIT 100');
    console.log('=== CUSTOMER_PO_DETAILS ===');
    console.table(poDetails);

    const [fctDetails] = await db.query('SELECT * FROM customer_forecast_details LIMIT 100');
    console.log('=== CUSTOMER_FORECAST_DETAILS ===');
    console.table(fctDetails);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
