const db = require('../src/config/db');

async function migrate() {
    try {
        console.log("Checking and inserting Approval Types for Sales modules...");

        const typesToInsert = [
            { code: 'FC', name: 'Customer Forecast' },
            { code: 'CPO', name: 'Customer PO' }
        ];

        for (const t of typesToInsert) {
            const [existing] = await db.query(
                'SELECT * FROM approval_types WHERE approval_name = ? OR approval_code = ?',
                [t.name, t.code]
            );

            if (existing.length === 0) {
                await db.query(
                    'INSERT INTO approval_types (approval_code, approval_name, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
                    [t.code, t.name]
                );
                console.log(`[INSERT OK] Approval Type: ${t.name} (${t.code})`);
            } else {
                console.log(`[EXISTS] Approval Type: ${t.name} (ID: ${existing[0].id})`);
            }
        }

        console.log("Migration completed successfully.");
    } catch (e) {
        console.error("Migration error:", e);
    } finally {
        process.exit(0);
    }
}

migrate();
