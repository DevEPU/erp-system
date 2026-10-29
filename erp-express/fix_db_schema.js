const db = require('./src/config/db');

async function fix() {
    try {
        console.log('Altering table purchase_budget_allocations to allow NULL for purchase_detail_id...');
        await db.query('ALTER TABLE purchase_budget_allocations MODIFY purchase_detail_id BIGINT UNSIGNED NULL');
        console.log('Table altered successfully.');
        
        const [rows] = await db.query('DESCRIBE purchase_budget_allocations');
        console.log('New schema:');
        console.log(JSON.stringify(rows.find(r => r.Field === 'purchase_detail_id'), null, 2));
        
        process.exit(0);
    } catch (err) {
        console.error('Error altering table:', err);
        process.exit(1);
    }
}

fix();
