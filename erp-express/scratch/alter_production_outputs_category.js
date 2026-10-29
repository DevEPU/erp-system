const db = require('../src/config/db');

async function main() {
    const connection = await db.getConnection();
    try {
        console.log("=== ALTERING production_outputs TABLE ===");
        await connection.execute(`
            ALTER TABLE production_outputs 
            ADD COLUMN ng_category VARCHAR(50) NULL AFTER notes;
        `);
        console.log("- Column 'ng_category' added successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    } finally {
        connection.release();
    }
}

main();
