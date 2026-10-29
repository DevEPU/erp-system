const db = require('../src/config/db');

async function checkMultiSuppliers() {
    console.log('--- CHECKING MULTI-SUPPLIER TABLES ---');
    const [tables] = await db.query('SHOW TABLES');
    console.log('Tables:', tables.map(t => Object.values(t)[0]));

    const [supCols] = await db.query("SHOW COLUMNS FROM products LIKE '%supplier%'");
    console.log('Product supplier columns:', supCols);

    process.exit(0);
}

checkMultiSuppliers().catch(e => {
    console.error(e);
    process.exit(1);
});
