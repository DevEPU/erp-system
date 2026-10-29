const db = require('./src/config/db');

async function audit() {
    try {
        const [depts] = await db.query('SELECT id, department_name FROM departments WHERE id IN (16, 20)');
        console.log('Departments:', JSON.stringify(depts, null, 2));
        
        const [budgets] = await db.query('SELECT id, no_budgeting, department_id, status FROM master_budget WHERE no_budgeting = "BDGT/HMRS-EPU/26/02"');
        console.log('Budgets with HMRS ref:', JSON.stringify(budgets, null, 2));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

audit();
