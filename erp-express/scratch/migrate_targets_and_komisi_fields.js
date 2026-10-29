const db = require('../src/config/db');

// Migration script for Salesman Month 1..12 Targets & Komisi Per Item ERP fields.

const salesmanColumns = [
    ['target_m1', "DECIMAL(18,2) NOT NULL DEFAULT 0.00 AFTER monthly_target"],
    ['target_m2', "DECIMAL(18,2) NOT NULL DEFAULT 0.00 AFTER target_m1"],
    ['target_m3', "DECIMAL(18,2) NOT NULL DEFAULT 0.00 AFTER target_m2"],
    ['target_m4', "DECIMAL(18,2) NOT NULL DEFAULT 0.00 AFTER target_m3"],
    ['target_m5', "DECIMAL(18,2) NOT NULL DEFAULT 0.00 AFTER target_m4"],
    ['target_m6', "DECIMAL(18,2) NOT NULL DEFAULT 0.00 AFTER target_m5"],
    ['target_m7', "DECIMAL(18,2) NOT NULL DEFAULT 0.00 AFTER target_m6"],
    ['target_m8', "DECIMAL(18,2) NOT NULL DEFAULT 0.00 AFTER target_m7"],
    ['target_m9', "DECIMAL(18,2) NOT NULL DEFAULT 0.00 AFTER target_m8"],
    ['target_m10', "DECIMAL(18,2) NOT NULL DEFAULT 0.00 AFTER target_m9"],
    ['target_m11', "DECIMAL(18,2) NOT NULL DEFAULT 0.00 AFTER target_m10"],
    ['target_m12', "DECIMAL(18,2) NOT NULL DEFAULT 0.00 AFTER target_m11"],
];

const komisiColumns = [
    ['min_price', "DECIMAL(18,2) NOT NULL DEFAULT 0.00 AFTER komisi_value"],
    ['min_qty', "INT NOT NULL DEFAULT 1 AFTER min_price"],
    ['start_date', "DATE NULL AFTER min_qty"],
    ['end_date', "DATE NULL AFTER start_date"],
    ['is_active', "TINYINT(1) NOT NULL DEFAULT 1 AFTER end_date"],
    ['notes', "TEXT NULL AFTER is_active"],
];

async function run() {
    try {
        console.log("=== MIGRATING SALESMAN MONTHLY TARGETS (M1 - M12) ===");
        for (const [name, definition] of salesmanColumns) {
            const [exists] = await db.query(
                `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'salesman' AND COLUMN_NAME = ?`,
                [name]
            );
            if (exists.length) {
                console.log(`SKIP  salesman.${name} (sudah ada)`);
                continue;
            }
            await db.query(`ALTER TABLE salesman ADD COLUMN ${name} ${definition}`);
            console.log(`ADD   salesman.${name}`);
        }

        console.log("\n=== MIGRATING KOMISI PER ITEM ERP FIELDS ===");
        for (const [name, definition] of komisiColumns) {
            const [exists] = await db.query(
                `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'komisi_per_item' AND COLUMN_NAME = ?`,
                [name]
            );
            if (exists.length) {
                console.log(`SKIP  komisi_per_item.${name} (sudah ada)`);
                continue;
            }
            await db.query(`ALTER TABLE komisi_per_item ADD COLUMN ${name} ${definition}`);
            console.log(`ADD   komisi_per_item.${name}`);
        }

        console.log('\nMigrasi Salesman Targets & Komisi Per Item selesai.');
    } catch (e) {
        console.error('Migrasi gagal:', e.message);
        process.exitCode = 1;
    } finally {
        await db.end();
    }
}

run();
