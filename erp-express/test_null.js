const db = require('./src/config/db');

async function testInsert() {
    try {
        console.log('Testing INSERT NULL into purchase_budget_allocations...');
        const [result] = await db.query(
            `INSERT INTO purchase_budget_allocations (
                purchase_id, purchase_detail_id, source_master_budget_id, source_budget_detail_id, 
                amount, is_borrowed_internal, is_borrowed_external, is_applied, created_at, updated_at
            ) VALUES (1, NULL, 1, 1, 100, 0, 0, 0, NOW(), NOW())`
        );
        console.log('Insert successful! ID:', result.insertId);
        await db.query('DELETE FROM purchase_budget_allocations WHERE id = ?', [result.insertId]);
        process.exit(0);
    } catch (err) {
        console.error('Insert failed:', err.message);
        process.exit(1);
    }
}

testInsert();
