const db = require('../config/db');

async function checkMRP2Details() {
    try {
        const [details] = await db.execute(`
            SELECT md.*, p.product_code as rm_code, p.product_name as rm_name, p.product_unit, s.supplier_code, s.supplier_name
            FROM mrp_details md
            JOIN products p ON md.product_id = p.id
            LEFT JOIN suppliers s ON md.supplier_id = s.id
            WHERE md.mrp_id = 40
            ORDER BY md.id ASC
        `);

        console.log(`MRP ID 40 (MRP/EPU/26/08/0002) has ${details.length} details:`);
        console.log(JSON.stringify(details, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkMRP2Details();
