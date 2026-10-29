const db = require('../src/config/db');

// Menambahkan kolom standar ERP pada modul Forecast & PO Customer.
// Aman dijalankan berulang: kolom dicek dulu sebelum ditambahkan.

const columns = {
    customer_forecasts: [
        ['doc_date', 'DATE NULL AFTER customer_id'],
        ['salesman_id', 'INT NULL AFTER doc_date'],
        ['warehouse_id', 'INT NULL AFTER salesman_id'],
        ['currency_id', 'BIGINT UNSIGNED NULL AFTER warehouse_id'],
        ['exchange_rate', 'DECIMAL(15,4) NOT NULL DEFAULT 1 AFTER currency_id'],
        ['total_qty', 'INT NOT NULL DEFAULT 0 AFTER exchange_rate'],
        ['total_amount', 'DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER total_qty'],
    ],
    customer_forecast_details: [
        ['price', 'DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER forecast_qty'],
        ['sub_total', 'DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER price'],
        ['remark', 'VARCHAR(255) NULL AFTER sub_total'],
    ],
    customer_po: [
        ['salesman_id', 'INT NULL AFTER customer_id'],
        ['ship_to_address', 'TEXT NULL AFTER delivery_date'],
        ['top_days', 'INT NOT NULL DEFAULT 0 AFTER ship_to_address'],
        ['due_date', 'DATE NULL AFTER top_days'],
        ['currency_id', 'BIGINT UNSIGNED NULL AFTER due_date'],
        ['exchange_rate', 'DECIMAL(15,4) NOT NULL DEFAULT 1 AFTER currency_id'],
        ['sub_total', 'DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER exchange_rate'],
        ['discount_percent', 'DECIMAL(8,2) NOT NULL DEFAULT 0 AFTER sub_total'],
        ['discount_amount', 'DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER discount_percent'],
        ['tax_percent', 'DECIMAL(8,2) NOT NULL DEFAULT 0 AFTER discount_amount'],
        ['tax_amount', 'DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER tax_percent'],
        ['grand_total', 'DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER tax_amount'],
    ],
    customer_po_details: [
        ['discount_percent', 'DECIMAL(8,2) NOT NULL DEFAULT 0 AFTER price'],
        ['discount_amount', 'DECIMAL(18,2) NOT NULL DEFAULT 0 AFTER discount_percent'],
        ['remark', 'VARCHAR(255) NULL AFTER sub_total'],
    ],
};

async function run() {
    try {
        for (const [table, cols] of Object.entries(columns)) {
            for (const [name, definition] of cols) {
                const [exists] = await db.query(
                    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
                    [table, name]
                );
                if (exists.length) {
                    console.log(`SKIP  ${table}.${name} (sudah ada)`);
                    continue;
                }
                await db.query(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
                console.log(`ADD   ${table}.${name}`);
            }
        }
        console.log('Migrasi selesai.');
    } catch (e) {
        console.error('Migrasi gagal:', e.message);
        process.exitCode = 1;
    } finally {
        await db.end();
    }
}

run();
