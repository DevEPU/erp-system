const db = require('../config/db');

async function checkMRPsCols() {
    try {
        const [cols] = await db.execute("DESCRIBE mrps");
        console.log("mrps columns:", cols.map(c => `${c.Field} (${c.Type})`));

        const [mrps] = await db.execute("SELECT * FROM mrps WHERE reference_code = 'MRP/EPU/26/08/0002'");
        console.log("MRP/EPU/26/08/0002 record:", mrps);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkMRPsCols();
