const db = require('./src/config/db');

async function check() {
    try {
        const [depts] = await db.query('SELECT id, department_name, department_code FROM departments');
        console.log('Departments in DB:', JSON.stringify(depts, null, 2));
        
        const [budgets] = await db.query('SELECT id, no_budgeting, department_id FROM master_budget LIMIT 10');
        console.log('Sample Budgets:', JSON.stringify(budgets, null, 2));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
