const db = require('../config/db');

async function checkMRPDetailsColumns() {
    try {
        const [cols] = await db.execute("DESCRIBE mrp_details");
        console.log("mrp_details columns:", cols.map(c => c.Field));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkMRPDetailsColumns();
