const db = require('../src/config/db');

async function check() {
  try {
    const [cats] = await db.execute('SELECT id, category_name FROM categories');
    console.log('Categories:', cats);
    
    const [counts] = await db.execute('SELECT COUNT(*) as total FROM products');
    console.log('Total products:', counts[0].total);

    const [types] = await db.execute('SELECT product_type, count(*) as c FROM products GROUP BY product_type');
    console.log('Product types count:', types);

    // Check user_categories
    const [uc] = await db.execute('SELECT * FROM user_categories LIMIT 20');
    console.log('User categories sample:', uc);

    // Check product_locations & warehouse_stocks
    const [pl] = await db.execute('SELECT COUNT(DISTINCT product_id) as c FROM product_locations');
    console.log('Products in product_locations:', pl[0].c);

    const [ws] = await db.execute('SELECT COUNT(DISTINCT product_id) as c FROM warehouse_stocks');
    console.log('Products in warehouse_stocks:', ws[0].c);

    const [regrindProds] = await db.execute(
      "SELECT id, product_code, product_name, category_id, product_type, product_unit FROM products WHERE product_name LIKE '%regrind%' OR product_name LIKE '%crush%' OR product_name LIKE '%resin%' OR product_name LIKE '%giling%' OR product_code LIKE '%REG%'"
    );
    console.log('Regrind / Resin products found:', regrindProds);

    // Also check what products have warehouse_id = 1 (MATKOM) or 5 (Crusher)
    const [matkomProds] = await db.execute(`
      SELECT p.id, p.product_code, p.product_name, p.product_unit, c.category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE EXISTS (SELECT 1 FROM product_locations pl WHERE pl.product_id = p.id AND pl.warehouse_id IN (1, 5))
         OR EXISTS (SELECT 1 FROM warehouse_stocks ws WHERE ws.product_id = p.id AND ws.warehouse_id IN (1, 5))
      LIMIT 30
    `);
    console.log('Sample MATKOM / Crusher products (first 30):', matkomProds);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

check();
