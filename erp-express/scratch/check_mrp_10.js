const db = require('../src/config/db');

async function checkMRP10() {
    console.log('--- INSPECTING MRP ID 10 ---');
    const [mrp] = await db.query('SELECT * FROM mrps ORDER BY id DESC LIMIT 1');
    console.log('MRP Header:', mrp[0]);

    const [details] = await db.query('SELECT * FROM mrp_details WHERE mrp_id = ?', [mrp[0].id]);
    console.log('MRP Details:', details);

    process.exit(0);
}

checkMRP10().catch(e => {
    console.error(e);
    process.exit(1);
});
