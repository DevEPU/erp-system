const db = require('../src/config/db');

// Migration script to extend salesman table with ERP standard fields.

const columns = [
    ['nik_employee', "VARCHAR(50) NULL AFTER code"],
    ['sales_team', "VARCHAR(100) NULL DEFAULT 'Direct Sales' AFTER nik_employee"],
    ['supervisor_name', "VARCHAR(100) NULL AFTER sales_team"],
    ['branch', "VARCHAR(100) NULL AFTER supervisor_name"],
    ['address', "TEXT NULL AFTER area"],
    ['commission_rate', "DECIMAL(5,2) NOT NULL DEFAULT 0.00 AFTER address"],
    ['monthly_target', "DECIMAL(18,2) NOT NULL DEFAULT 0.00 AFTER commission_rate"],
    ['yearly_target', "DECIMAL(18,2) NOT NULL DEFAULT 0.00 AFTER monthly_target"],
    ['max_discount_limit', "DECIMAL(5,2) NOT NULL DEFAULT 0.00 AFTER yearly_target"],
    ['credit_limit_authority', "DECIMAL(18,2) NOT NULL DEFAULT 0.00 AFTER max_discount_limit"],
    ['join_date', "DATE NULL AFTER credit_limit_authority"],
    ['notes', "TEXT NULL AFTER join_date"],
];

async function run() {
    try {
        for (const [name, definition] of columns) {
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
        console.log('Migrasi ERP salesman fields selesai.');
    } catch (e) {
        console.error('Migrasi gagal:', e.message);
        process.exitCode = 1;
    } finally {
        await db.end();
    }
}

run();
