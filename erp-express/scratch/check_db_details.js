const db = require('../src/config/db');

async function test() {
  try {
    // Check all categories
    const [cats] = await db.execute('SELECT id, category_name FROM categories');
    console.log('Categories:', cats);

    // Check users and their roles
    const [users] = await db.execute(`
      SELECT u.id, u.name, u.email, r.name as role_name
      FROM users u
      LEFT JOIN model_has_roles mhr ON u.id = mhr.model_id
      LEFT JOIN roles r ON mhr.role_id = r.id
      LIMIT 10
    `);
    console.log('Users & roles:', users);

    // Let's check products ordered by id desc
    const [recentProds] = await db.execute(`
      SELECT p.id, p.product_code, p.product_name, p.category_id, c.category_name, p.product_unit
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.id DESC
      LIMIT 15
    `);
    console.log('Recent products in DB (id DESC):', recentProds);

    // Check products matching "STICKER"
    const [stickers] = await db.execute(`
      SELECT p.id, p.product_code, p.product_name, p.category_id, c.category_name, p.product_unit
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.product_name LIKE '%STICKER OUTER%'
    `);
    console.log('Sticker products:', stickers);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

test();
