const mysql = require('mysql2/promise');

async function inspectData() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    try {
        console.log('--- MRP 55 & 56 Details ---');
        const [rows] = await pool.execute(`
            SELECT md.id, md.mrp_id, md.product_id, p.product_code, p.product_name, md.ord_qty, md.mrp_qty, md.qty_released_pr
            FROM mrp_details md
            JOIN products p ON md.product_id = p.id
            WHERE md.mrp_id IN (55, 56)
            ORDER BY p.product_code, md.mrp_id
        `);
        console.log(`Found ${rows.length} rows:`);
        rows.forEach(r => console.log(`MRP ${r.mrp_id} | ${r.product_code} (${r.product_name}) -> mrp_qty: ${r.mrp_qty}, released: ${r.qty_released_pr}`));

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

inspectData();
