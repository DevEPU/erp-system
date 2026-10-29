const db = require('../src/config/db');

async function main() {
  const [rows] = await db.query(`
    SELECT id, product_code, product_name, product_type, category_id
    FROM products
    WHERE product_name LIKE '%regrind%'
       OR product_name LIKE '%giling%'
       OR product_name LIKE '%crush%'
       OR product_code LIKE '%crush%'
       OR product_code LIKE '%EPCH%'
  `);
  console.log('ALL MATCHES:', rows);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
