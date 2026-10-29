const db = require('../src/config/db');

async function migrate() {
    const connection = await db.getConnection();
    try {
        console.log("Altering production_outputs table...");
        await connection.execute(`
            ALTER TABLE production_outputs 
            ADD COLUMN ng_type VARCHAR(255) NULL AFTER qty_ng,
            ADD COLUMN notes TEXT NULL AFTER ng_type
        `);
        console.log("Migration successful!");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    } finally {
        connection.release();
    }
}

migrate();
