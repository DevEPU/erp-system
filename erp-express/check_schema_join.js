const db = require('./src/config/db');

async function checkSchema() {
    try {
        const [mb] = await db.query('DESCRIBE master_budget');
        console.log('master_budget schema:', JSON.stringify(mb.find(f => f.Field === 'department_id'), null, 2));
        
        const [depts] = await db.query('DESCRIBE departments');
        console.log('departments schema:', JSON.stringify(depts.find(f => f.Field === 'id'), null, 2));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
