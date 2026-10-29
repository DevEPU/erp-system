const db = require('../src/config/db');

async function check() {
    try {
        const [categories] = await db.query("SELECT id, category_name FROM categories");
        console.log('CATEGORIES:', categories);
        
        const [warehouses] = await db.query("SELECT id, name, code FROM warehouses");
        console.log('WAREHOUSES:', warehouses);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

check();
