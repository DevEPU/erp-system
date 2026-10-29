const db = require('../src/config/db');

async function checkAllMRPs() {
    console.log('--- ALL ROWS IN TABLE mrps ---');
    const [rows] = await db.query('SELECT id, reference_code, po_customer_id, status, created_at FROM mrps ORDER BY id DESC');
    console.log('Count of mrps in DB:', rows.length);
    console.log('Rows:', rows);
    process.exit(0);
}

checkAllMRPs().catch(e => {
    console.error(e);
    process.exit(1);
});
