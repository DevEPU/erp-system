const mysql = require('mysql2/promise');

async function setup() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    try {
        console.log('Creating bank_accounts table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS bank_accounts (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(50) NOT NULL,
                name VARCHAR(255) NOT NULL,
                address TEXT,
                phone VARCHAR(50),
                note TEXT,
                account_number VARCHAR(100),
                status ENUM('Active', 'Inactive') DEFAULT 'Active',
                currency_id BIGINT UNSIGNED,
                account_type ENUM('Bank', 'Cash') DEFAULT 'Bank',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (currency_id) REFERENCES currencies(id) ON DELETE SET NULL
            )
        `);
        console.log('Table bank_accounts created successfully.');

        // Add some default data if empty
        const [rows] = await connection.query('SELECT COUNT(*) as count FROM bank_accounts');
        if (rows[0].count === 0) {
            console.log('Inserting default bank account...');
            // Find ID of IDR currency
            const [currencies] = await connection.query("SELECT id FROM currencies WHERE code = 'IDR' LIMIT 1");
            const currencyId = currencies.length > 0 ? currencies[0].id : null;

            await connection.query(
                "INSERT INTO bank_accounts (code, name, account_number, status, currency_id, account_type) VALUES (?, ?, ?, ?, ?, ?)",
                ['KAS-BESAR', 'Kas Besar', '-', 'Active', currencyId, 'Cash']
            );
            console.log('Default bank account inserted.');
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await connection.end();
    }
}

setup();
