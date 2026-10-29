const db = require('../src/config/db');

async function checkPlanningProduksiCols() {
    console.log('--- CHECKING planning_produksi COLUMNS ---');
    const [cols] = await db.query('DESCRIBE planning_produksi');
    console.log('Columns:', cols.map(c => `${c.Field} (${c.Type})`));
    process.exit(0);
}

checkPlanningProduksiCols().catch(e => {
    console.error(e);
    process.exit(1);
});
