const mysql = require('mysql2/promise');

async function inspectStayAskiAfterFix() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    try {
        console.log("=== INSPECTING STAY ASKI & CAPLOCK NUT AFTER DEDUPLICATION FIX ===");
        const [dbItems] = await connection.query(`
            SELECT id, bom_id, parent_item_id, item_type, product_code, product_name, price, qty
            FROM bom_items
            WHERE product_name LIKE '%STAY ASKI%' OR product_name LIKE '%STAY ASKO%' OR product_code LIKE '%KASKI%' OR product_code LIKE '%KASKO%'
               OR product_code LIKE '%CPLOC%'
        `);
        console.table(dbItems);

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

inspectStayAskiAfterFix();
