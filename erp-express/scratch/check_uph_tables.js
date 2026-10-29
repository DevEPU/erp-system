const db = require('../src/config/db');

async function checkUphTables() {
    console.log('--- CHECKING machine_mold_uph COLUMNS ---');
    try {
        const [uCols] = await db.query('DESCRIBE machine_mold_uph');
        console.log('machine_mold_uph cols:', uCols.map(c => `${c.Field} (${c.Type})`));
        const [uData] = await db.query('SELECT * FROM machine_mold_uph LIMIT 10');
        console.log('Sample machine_mold_uph data:', uData);
    } catch(e) { console.log('error:', e.message); }

    console.log('\n--- CHECKING mold_products COLUMNS ---');
    try {
        const [mpCols] = await db.query('DESCRIBE mold_products');
        console.log('mold_products cols:', mpCols.map(c => `${c.Field} (${c.Type})`));
        const [mpData] = await db.query('SELECT * FROM mold_products LIMIT 10');
        console.log('Sample mold_products data:', mpData);
    } catch(e) { console.log('error:', e.message); }

    process.exit(0);
}

checkUphTables().catch(e => {
    console.error(e);
    process.exit(1);
});
