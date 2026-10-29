const db = require('../src/config/db');

async function run() {
  try {
    const [sales] = await db.query('SELECT * FROM sales LIMIT 10');
    console.log('=== SALES ===');
    console.table(sales);

    const [details] = await db.query('SELECT * FROM sale_details LIMIT 10');
    console.log('=== SALE_DETAILS ===');
    console.table(details);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
