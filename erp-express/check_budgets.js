const db = require('./src/config/db');

async function checkBudgets() {
    try {
        const [rows] = await db.query('SELECT id, no_budgeting, department_id, is_mandatory, status, bulan FROM master_budget WHERE department_id = 20 AND bulan = 2');
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkBudgets();
