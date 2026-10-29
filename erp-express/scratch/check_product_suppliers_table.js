const db = require('../src/config/db');

async function checkProductSuppliersTable() {
    console.log('--- CHECKING product_suppliers SCHEMA & ROWS ---');
    const [cols] = await db.query('DESCRIBE product_suppliers');
    console.log('Columns:', cols.map(c => c.Field));

    const [rows] = await db.query('SELECT * FROM product_suppliers LIMIT 10');
    console.log('Sample rows:', rows);

    process.exit(0);
}

checkProductSuppliersTable().catch(e => {
    console.error(e);
    process.exit(1);
});
