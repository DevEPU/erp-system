const db = require('../src/config/db');

async function run() {
  try {
    const [types] = await db.query('SELECT DISTINCT product_type FROM products');
    console.log('=== Distinct Product Types ===');
    console.log(types.map(t => t.product_type));

    const [prefixes] = await db.query(
      `SELECT LEFT(product_code, 5) as prefix, COUNT(*) as count 
       FROM products 
       WHERE product_code IS NOT NULL 
       GROUP BY prefix`
    );
    console.log('\n=== Product Code Prefixes ===');
    console.table(prefixes);

    // Let's also check categories
    const [categories] = await db.query('SELECT id, category_name FROM categories');
    console.log('\n=== Categories ===');
    console.table(categories);

  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
