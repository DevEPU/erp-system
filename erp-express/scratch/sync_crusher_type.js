const db = require('../src/config/db');

async function main() {
  // 1. Check if Crusher exists in product_types
  const [existing] = await db.query("SELECT * FROM product_types WHERE name = 'Crusher'");
  if (existing.length === 0) {
    await db.query(`
      INSERT INTO product_types (name, description, is_active)
      VALUES ('Crusher', 'Material Hasil Gilingan (Regrind / Crusher)', 1)
    `);
    console.log('Added Crusher to product_types');
  } else {
    console.log('Crusher already in product_types');
  }

  // 2. Set all 4 Crusher products to product_type = 'Crusher'
  const [updateRes] = await db.query(`
    UPDATE products 
    SET product_type = 'Crusher'
    WHERE product_code IN ('EPCH-PPCOMPCRH', 'EPCH-MABSCRSWH', 'EPCH-CPPGF30CL', 'EPCH-PPBLCKCRH')
  `);
  console.log('Updated crusher products to product_type Crusher:', updateRes.affectedRows);

  // 3. Verify
  const [prods] = await db.query(`
    SELECT id, product_code, product_name, product_type, category_id
    FROM products
    WHERE category_id = 18 OR product_type = 'Crusher'
    ORDER BY (CASE WHEN product_type = 'Crusher' THEN 0 ELSE 1 END), product_name ASC
  `);
  console.log(`Total relevant items: ${prods.length}`);
  console.log('Crusher items:', prods.filter(p => p.product_type === 'Crusher'));

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
