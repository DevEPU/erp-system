const db = require('../src/config/db');

(async () => {
    try {
        const [rows] = await db.query(`
            SELECT s.supplier_name, p.product_name, COUNT(*) as cnt 
            FROM vendor_daily_schedules vds
            JOIN suppliers s ON vds.supplier_id = s.id
            JOIN products p ON vds.product_id = p.id
            GROUP BY s.supplier_name, p.product_name
        `);
        console.table(rows);
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
})();
