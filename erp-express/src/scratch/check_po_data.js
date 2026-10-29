const mysql = require('mysql2/promise');

async function checkPO() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    try {
        const [mrps] = await pool.execute('SELECT id, po_customer_id, reference_code FROM mrps WHERE id = 55');
        console.log('MRP 55:', mrps[0]);
        const [pos] = await pool.execute('SELECT * FROM customer_po');
        console.log('Customer POs:', pos);
        const [poDetails] = await pool.execute('SELECT * FROM customer_po_details');
        console.log('Customer PO Details:', poDetails);
    } finally {
        await pool.end();
    }
}

checkPO();
