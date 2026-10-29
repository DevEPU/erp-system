const db = require('../src/config/db');

async function run() {
  try {
    const [productsDesc] = await db.query('DESCRIBE products');
    console.log('\n=== PRODUCTS ===');
    productsDesc.forEach(c => console.log(`${c.Field} - ${c.Type}`));

    const [psDesc] = await db.query('DESCRIBE product_suppliers');
    console.log('\n=== PRODUCT_SUPPLIERS ===');
    psDesc.forEach(c => console.log(`${c.Field} - ${c.Type}`));

    const [puDesc] = await db.query('DESCRIBE product_units');
    console.log('\n=== PRODUCT_UNITS ===');
    puDesc.forEach(c => console.log(`${c.Field} - ${c.Type}`));
    
    // Check one row of each
    const [prodRow] = await db.query('SELECT * FROM products LIMIT 1');
    console.log('\nProducts sample:', prodRow[0]);

    const [psRow] = await db.query('SELECT * FROM product_suppliers LIMIT 1');
    console.log('\nProduct suppliers sample:', psRow[0]);
  } catch (e) {
    console.error(e.message);
  } finally {
    process.exit(0);
  }
}

run();
