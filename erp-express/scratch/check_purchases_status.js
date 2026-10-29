const db = require('../src/config/db');

async function checkPurchaseStatus() {
    const [cols] = await db.query("SHOW COLUMNS FROM purchases LIKE 'status'");
    console.log('Status column type:', cols[0]);
    process.exit(0);
}

checkPurchaseStatus().catch(e => {
    console.error(e);
    process.exit(1);
});
