const db = require('../src/config/db');
async function check() {
    try {
        const [wsDesc] = await db.query('DESCRIBE warehouse_stocks');
        console.log('warehouse_stocks schema:', wsDesc);
        
        const [psDesc] = await db.query('DESCRIBE product_suppliers');
        console.log('product_suppliers schema:', psDesc);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
