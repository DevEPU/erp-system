const db = require('../src/config/db');

async function check() {
  try {
    const [prods] = await db.execute(`
      SELECT p.id, p.product_code, p.product_name, p.product_type, p.product_unit,
        (SELECT COUNT(*) FROM product_locations pl WHERE pl.product_id = p.id) as loc_count,
        (SELECT COUNT(*) FROM warehouse_stocks ws WHERE ws.product_id = p.id) as stock_count
      FROM products p
      WHERE p.category_id = 18
    `);
    console.log('Raw Material products & warehouse linkage:');
    let linkedCount = 0;
    let unlinkedCount = 0;
    prods.forEach(p => {
      const linked = p.loc_count > 0 || p.stock_count > 0;
      if (linked) linkedCount++;
      else unlinkedCount++;
      console.log(`[${linked ? 'OK' : 'NO'}] ${p.product_name} | loc=${p.loc_count} stock=${p.stock_count}`);
    });
    console.log(`\nTotal: ${prods.length} | Linked to warehouse: ${linkedCount} | Not linked: ${unlinkedCount}`);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

check();
