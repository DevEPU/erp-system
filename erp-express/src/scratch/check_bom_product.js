const db = require('../config/db');

async function run() {
  try {
    const [products] = await db.execute('SELECT * FROM products WHERE product_code = ?', ['EPPI-FRGRK1LAM']);
    console.log('--- Product ---');
    console.log(products);

    if (products.length > 0) {
      const product = products[0];
      const [categories] = await db.execute('SELECT * FROM categories WHERE id = ?', [product.category_id]);
      console.log('--- Category ---');
      console.log(categories);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
