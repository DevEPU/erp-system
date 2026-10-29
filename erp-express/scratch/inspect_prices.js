const db = require('../src/config/db');

async function run() {
  try {
    // Check some products with non-zero product_price
    const [nonZeroProds] = await db.query(
      `SELECT p.id, p.product_code, p.product_name, p.product_price, 
              pu.buy_price as unit_buy, pu.sell_price as unit_sell,
              ps.purchase_price as ps_buy, ps.sell_price as ps_sell, ps.is_primary
       FROM products p
       LEFT JOIN product_units pu ON p.id = pu.product_id AND pu.level = 1
       LEFT JOIN product_suppliers ps ON p.id = ps.product_id
       WHERE p.product_price > 0
       LIMIT 10`
    );
    console.log('=== Products with non-zero price ===');
    console.log(nonZeroProds);

  } catch (e) {
    console.error(e.message);
  } finally {
    process.exit(0);
  }
}

run();
