const db = require('../src/config/db');

async function main() {
  try {
    const [pt] = await db.query('SELECT * FROM product_types');
    console.log('PRODUCT TYPES TABLE:', pt);
  } catch(e) {
    console.log('ERR product_types:', e.message);
  }
  const [types] = await db.query('SELECT DISTINCT product_type FROM products');
  console.log('DISTINCT product_type in products:', types);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
