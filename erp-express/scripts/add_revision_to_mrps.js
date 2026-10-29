const db = require('../src/config/db');

async function migrate() {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        console.log('--- Migrating Database for MRP Revision System ---');

        const [cols] = await connection.execute("SHOW COLUMNS FROM mrps LIKE 'revision_number'");
        if (cols.length === 0) {
            await connection.execute("ALTER TABLE mrps ADD COLUMN revision_number INT UNSIGNED NOT NULL DEFAULT 0 AFTER reference_code");
            console.log("Added column 'revision_number' to 'mrps' table.");
        } else {
            console.log("Column 'revision_number' already exists in 'mrps' table.");
        }

        const [parentCols] = await connection.execute("SHOW COLUMNS FROM mrps LIKE 'parent_mrp_id'");
        if (parentCols.length === 0) {
            await connection.execute("ALTER TABLE mrps ADD COLUMN parent_mrp_id BIGINT UNSIGNED NULL AFTER revision_number");
            console.log("Added column 'parent_mrp_id' to 'mrps' table.");
        } else {
            console.log("Column 'parent_mrp_id' already exists in 'mrps' table.");
        }

        await connection.commit();
        console.log('--- Database Migration Completed Successfully ---');
        process.exit(0);

    } catch (error) {
        await connection.rollback();
        console.error('Migration Error:', error);
        process.exit(1);
    } finally {
        connection.release();
    }
}

migrate();
