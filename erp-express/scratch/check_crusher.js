const db = require('../src/config/db');

async function main() {
  const [allCats] = await db.query('SELECT id, category_code, category_name FROM categories');
  console.log('ALL CATEGORIES:', allCats);

  const [types] = await db.query('SELECT product_type, COUNT(*) as c FROM products GROUP BY product_type');
  console.log('PRODUCT TYPES:', types);

  const [crushProds] = await db.query(`
    SELECT p.id, p.product_code, p.product_name, p.product_type, p.category_id, c.category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.product_name LIKE '%crush%' 
       OR p.product_type LIKE '%crush%'
       OR p.product_code LIKE '%crush%'
       OR p.product_code LIKE '%EPCH%'
  `);
  console.log('CRUSH PRODUCTS:', crushProds);

  // Check what products are in category 18
  const [cat18Prods] = await db.query(`
    SELECT p.id, p.product_code, p.product_name, p.product_type, p.category_id
    FROM products p
    WHERE p.category_id = 18
  `);
  console.log('CAT 18 PRODUCTS COUNT:', cat18Prods.length);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
