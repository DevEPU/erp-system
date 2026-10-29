const db = require('../src/config/db');

// Menambahkan kolom standar ERP pada modul Forecast (customer_forecasts & customer_forecast_details).
// Aman dijalankan berulang: kolom dicek dulu sebelum ditambahkan.

const columns = {
    customer_forecasts: [
        ['forecast_type', "VARCHAR(50) NOT NULL DEFAULT 'Sales Forecast' AFTER reference"],
        ['period_type', "VARCHAR(20) NOT NULL DEFAULT 'Monthly' AFTER forecast_type"],
        ['confidence_level', "DECIMAL(5,2) NOT NULL DEFAULT 100.00 AFTER exchange_rate"],
        ['weighted_amount', "DECIMAL(18,2) NOT NULL DEFAULT 0.00 AFTER total_amount"],
        ['revision_number', "VARCHAR(20) NOT NULL DEFAULT 'V1.0' AFTER weighted_amount"],
        ['valid_until', "DATE NULL AFTER revision_number"],
    ],
    customer_forecast_details: [
        ['target_date', "DATE NULL AFTER price"],
        ['confidence_level', "DECIMAL(5,2) NOT NULL DEFAULT 100.00 AFTER target_date"],
        ['weighted_amount', "DECIMAL(18,2) NOT NULL DEFAULT 0.00 AFTER sub_total"],
        ['min_qty', "INT NOT NULL DEFAULT 0 AFTER weighted_amount"],
        ['max_qty', "INT NOT NULL DEFAULT 0 AFTER min_qty"],
        ['fulfilled_qty', "INT NOT NULL DEFAULT 0 AFTER max_qty"],
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
        console.log('Migrasi ERP forecast fields selesai.');
    } catch (e) {
        console.error('Migrasi gagal:', e.message);
        process.exitCode = 1;
    } finally {
        await db.end();
    }
}

run();
