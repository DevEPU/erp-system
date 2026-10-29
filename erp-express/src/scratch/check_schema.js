const db = require('../config/db');

(async () => {
  try {
    const [c1] = await db.query('SELECT DISTINCT product_type FROM products WHERE product_type IS NOT NULL');
    console.log('product_types:', c1);

    const [c2] = await db.query("SELECT DISTINCT ng_type FROM production_outputs WHERE ng_type IS NOT NULL AND ng_type != ''");
    console.log('ng_types:', c2);

    const [c3] = await db.query("SELECT DISTINCT ng_category FROM production_outputs WHERE ng_category IS NOT NULL AND ng_category != ''");
    console.log('ng_categories:', c3);

    const [c4] = await db.query("SELECT DISTINCT status FROM production_outputs WHERE status IS NOT NULL");
    console.log('production_output_statuses:', c4);

    const [c5] = await db.query("SELECT DISTINCT status FROM work_orders WHERE status IS NOT NULL");
    console.log('work_order_statuses:', c5);

    const [c6] = await db.query("SELECT DISTINCT action FROM crusher_logs WHERE action IS NOT NULL");
    console.log('crusher_actions:', c6);

    const [c7] = await db.query("SELECT DISTINCT status FROM customer_claims WHERE status IS NOT NULL");
    console.log('claim_statuses:', c7);

    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
})();
