const db = require('../src/config/db');

async function checkSalesmanSchema() {
    try {
        const [cols] = await db.query("SHOW COLUMNS FROM salesman");
        console.log("Salesman Columns in MySQL:");
        cols.forEach(c => console.log(` - ${c.Field}: ${c.Type} (${c.Null === 'YES' ? 'NULL' : 'NOT NULL'})`));
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await db.end();
    }
}

checkSalesmanSchema();
