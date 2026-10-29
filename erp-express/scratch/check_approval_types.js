const db = require('../src/config/db');

async function checkApprovalTypes() {
    try {
        const [types] = await db.query('SELECT * FROM approval_types');
        console.log("Approval Types in DB:", types);
        const [rules] = await db.query('SELECT * FROM approval_rules');
        console.log("Approval Rules in DB:", rules);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

checkApprovalTypes();
