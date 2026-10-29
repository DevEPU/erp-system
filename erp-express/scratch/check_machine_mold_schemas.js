const db = require('../src/config/db');

async function checkMachineMoldSchemas() {
    console.log('--- CHECKING MACHINES TABLE ---');
    try {
        const [mCols] = await db.query('DESCRIBE machines');
        console.log('machines cols:', mCols.map(c => `${c.Field} (${c.Type})`));
    } catch(e) { console.log('machines error:', e.message); }

    console.log('\n--- CHECKING MOLDS TABLE ---');
    try {
        const [moldCols] = await db.query('DESCRIBE molds');
        console.log('molds cols:', moldCols.map(c => `${c.Field} (${c.Type})`));
    } catch(e) { console.log('molds error:', e.message); }

    console.log('\n--- CHECKING TABLES LIKE %uph% OR %product% ---');
    try {
        const [tables] = await db.query("SHOW TABLES LIKE '%mould%' OR SHOW TABLES LIKE '%mold%' OR SHOW TABLES LIKE '%machine%' OR SHOW TABLES LIKE '%uph%'");
        console.log('Related tables:', tables);
    } catch(e) {}

    const [allT] = await db.query("SHOW TABLES");
    console.log('\nAll tables in database:', allT.map(t => Object.values(t)[0]));

    process.exit(0);
}

checkMachineMoldSchemas().catch(e => {
    console.error(e);
    process.exit(1);
});
