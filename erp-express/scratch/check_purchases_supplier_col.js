const db = require('../src/config/db');

async function checkPurchasesColumns() {
    const [cols] = await db.query("SHOW COLUMNS FROM purchases LIKE '%supplier%'");
    console.log('Purchases supplier columns:', cols);
    process.exit(0);
}

checkPurchasesColumns().catch(e => {
    console.error(e);
    process.exit(1);
});
