const db = require('../src/config/db');

async function run() {
  try {
    const codes = [
      'EPPL-ELMNTK60R',
      'EPCV-FCVACLK1A',
      'EPCS-FCSEACK1A',
      'EPPL-ELMNTK0JA'
    ];
    const [rows] = await db.query(
      `SELECT * FROM products WHERE product_code IN (${codes.map(() => '?').join(',')})`,
      codes
    );
    console.log('=== MATCHING PRODUCTS ===');
    console.log(rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
