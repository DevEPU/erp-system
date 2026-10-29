const db = require('../src/config/db');

async function run() {
  try {
    const [sheets] = await db.query('SELECT * FROM order_sheets LIMIT 10');
    console.log('=== ORDER_SHEETS ===');
    console.table(sheets);

    const [details] = await db.query('SELECT * FROM order_sheet_details LIMIT 10');
    console.log('=== ORDER_SHEET_DETAILS ===');
    console.table(details);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
