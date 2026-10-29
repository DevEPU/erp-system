const mysql = require('mysql2/promise');

async function checkDetails() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    try {
        const [rows] = await pool.execute('SELECT COUNT(*) as cnt FROM mrp_details WHERE mrp_id = 55');
        console.log(`MRP 55 detail count: ${rows[0].cnt}`);
    } finally {
        await pool.end();
    }
}

checkDetails();
