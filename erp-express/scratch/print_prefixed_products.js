const db = require('../src/config/db');

async function run() {
  try {
    const prefixes = ['EPPL-%', 'EPBL-%', 'EPCV-%', 'EPCS-%', 'EPPI-%'];
    const [rows] = await db.query(
      `SELECT id, product_code, product_name, product_type, category_id 
       FROM products 
       WHERE product_code LIKE 'EPPL-%' 
          OR product_code LIKE 'EPBL-%'
          OR product_code LIKE 'EPCV-%'
          OR product_code LIKE 'EPCS-%'
          OR product_code LIKE 'EPPI-%'`
    );
    console.log('=== Products with target prefixes ===');
    console.table(rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
