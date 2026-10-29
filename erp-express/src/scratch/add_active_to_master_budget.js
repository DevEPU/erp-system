const db = require('../config/db');

async function run() {
    try {
        const [cols] = await db.query(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'master_budget' AND COLUMN_NAME = 'is_active'"
        );
        if (cols.length === 0) {
            await db.query('ALTER TABLE master_budget ADD COLUMN is_active TINYINT(1) DEFAULT 1');
            console.log('is_active column added successfully!');
        } else {
            console.log('is_active already exists!');
        }
        process.exit(0);
    } catch (e) {
        console.error('Migration error:', e);
        process.exit(1);
    }
}

run();
