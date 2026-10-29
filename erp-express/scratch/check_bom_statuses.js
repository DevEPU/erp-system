const db = require('../src/config/db');

async function checkBOMStatuses() {
    console.log('--- CHECKING BOM STATUSES & CODES ---');
    const [statuses] = await db.query('SELECT DISTINCT status FROM boms');
    console.log('Distinct BOM statuses:', statuses);

    const [boms] = await db.query('SELECT id, bom_code, finished_good_code, status FROM boms LIMIT 20');
    console.log('Sample boms:', boms);

    process.exit(0);
}

checkBOMStatuses().catch(e => {
    console.error(e);
    process.exit(1);
});
