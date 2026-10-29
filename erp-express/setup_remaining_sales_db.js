const db = require('./src/config/db');

const run = async () => {
    try {
        console.log('--- STARTING REMAINING SALES MASTER TABLES MIGRATION ---');

        // 1. Salesman
        await db.query(`
            CREATE TABLE IF NOT EXISTS salesman (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                code VARCHAR(30) NULL UNIQUE,
                phone VARCHAR(30) NULL,
                email VARCHAR(100) NULL,
                area VARCHAR(100) NULL,
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✔ salesman');

        // 2. Tipe Customer
        await db.query(`
            CREATE TABLE IF NOT EXISTS tipe_customer (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT NULL,
                discount_pct DECIMAL(5,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✔ tipe_customer');

        // 3. Grup Customer
        await db.query(`
            CREATE TABLE IF NOT EXISTS grup_customer (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✔ grup_customer');

        // 4. Penagihan Piutang (invoice/billing)
        await db.query(`
            CREATE TABLE IF NOT EXISTS penagihan_piutang (
                id INT AUTO_INCREMENT PRIMARY KEY,
                reference VARCHAR(50) NOT NULL UNIQUE,
                customer_id INT NULL,
                invoice_reference VARCHAR(100) NULL,
                amount DECIMAL(15,2) DEFAULT 0,
                due_date DATE NULL,
                note TEXT NULL,
                status VARCHAR(20) DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✔ penagihan_piutang');

        // 5. Penerimaan Piutang (payment receipt)
        await db.query(`
            CREATE TABLE IF NOT EXISTS penerimaan_piutang (
                id INT AUTO_INCREMENT PRIMARY KEY,
                reference VARCHAR(50) NOT NULL UNIQUE,
                customer_id INT NULL,
                penagihan_reference VARCHAR(100) NULL,
                amount_received DECIMAL(15,2) DEFAULT 0,
                payment_method VARCHAR(50) NULL,
                received_date DATE NOT NULL,
                note TEXT NULL,
                status VARCHAR(20) DEFAULT 'Draft',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✔ penerimaan_piutang');

        // 6. Retur Penjualan
        await db.query(`
            CREATE TABLE IF NOT EXISTS retur_penjualan (
                id INT AUTO_INCREMENT PRIMARY KEY,
                reference VARCHAR(50) NOT NULL UNIQUE,
                customer_id INT NULL,
                invoice_reference VARCHAR(100) NULL,
                return_date DATE NOT NULL,
                reason TEXT NULL,
                status VARCHAR(20) DEFAULT 'Draft',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        await db.query(`
            CREATE TABLE IF NOT EXISTS retur_penjualan_details (
                id INT AUTO_INCREMENT PRIMARY KEY,
                retur_id INT NOT NULL,
                product_id INT NULL,
                product_name VARCHAR(255) NOT NULL,
                product_code VARCHAR(100) NULL,
                product_unit VARCHAR(50) NULL,
                qty_returned DECIMAL(15,2) DEFAULT 0,
                price DECIMAL(15,2) DEFAULT 0,
                sub_total DECIMAL(15,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (retur_id) REFERENCES retur_penjualan(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✔ retur_penjualan & details');

        // 7. Tanda Terima
        await db.query(`
            CREATE TABLE IF NOT EXISTS tanda_terima (
                id INT AUTO_INCREMENT PRIMARY KEY,
                reference VARCHAR(50) NOT NULL UNIQUE,
                customer_id INT NULL,
                invoice_reference VARCHAR(100) NULL,
                received_by VARCHAR(100) NULL,
                receive_date DATE NOT NULL,
                note TEXT NULL,
                status VARCHAR(20) DEFAULT 'Draft',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✔ tanda_terima');

        // 8. Jurnal AR
        await db.query(`
            CREATE TABLE IF NOT EXISTS jurnal_ar (
                id INT AUTO_INCREMENT PRIMARY KEY,
                reference VARCHAR(50) NOT NULL UNIQUE,
                customer_id INT NULL,
                transaction_reference VARCHAR(100) NULL,
                debit DECIMAL(15,2) DEFAULT 0,
                credit DECIMAL(15,2) DEFAULT 0,
                date DATE NOT NULL,
                description TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✔ jurnal_ar');

        // 9. Jurnal Penjualan
        await db.query(`
            CREATE TABLE IF NOT EXISTS jurnal_penjualan (
                id INT AUTO_INCREMENT PRIMARY KEY,
                reference VARCHAR(50) NOT NULL UNIQUE,
                customer_id INT NULL,
                invoice_reference VARCHAR(100) NULL,
                debit DECIMAL(15,2) DEFAULT 0,
                credit DECIMAL(15,2) DEFAULT 0,
                date DATE NOT NULL,
                description TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✔ jurnal_penjualan');

        // 10. Rumus Komisi
        await db.query(`
            CREATE TABLE IF NOT EXISTS rumus_komisi (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                type VARCHAR(30) DEFAULT 'percentage',
                value DECIMAL(10,4) DEFAULT 0,
                min_sales DECIMAL(15,2) DEFAULT 0,
                max_sales DECIMAL(15,2) NULL,
                description TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✔ rumus_komisi');

        // 11. Komisi Per Item
        await db.query(`
            CREATE TABLE IF NOT EXISTS komisi_per_item (
                id INT AUTO_INCREMENT PRIMARY KEY,
                salesman_id INT NULL,
                product_id INT NULL,
                product_name VARCHAR(255) NULL,
                product_code VARCHAR(100) NULL,
                komisi_type VARCHAR(30) DEFAULT 'percentage',
                komisi_value DECIMAL(10,4) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✔ komisi_per_item');

        // 12. Weekday Settings
        await db.query(`
            CREATE TABLE IF NOT EXISTS weekday_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                day_name VARCHAR(20) NOT NULL,
                day_number INT NOT NULL,
                is_working TINYINT(1) DEFAULT 1,
                start_time TIME DEFAULT '08:00:00',
                end_time TIME DEFAULT '17:00:00',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        // Seed weekday defaults if empty
        const [wd] = await db.query('SELECT COUNT(*) as cnt FROM weekday_settings');
        if (wd[0].cnt === 0) {
            await db.query(`INSERT INTO weekday_settings (day_name, day_number, is_working, start_time, end_time) VALUES
                ('Senin', 1, 1, '08:00:00', '17:00:00'),
                ('Selasa', 2, 1, '08:00:00', '17:00:00'),
                ('Rabu', 3, 1, '08:00:00', '17:00:00'),
                ('Kamis', 4, 1, '08:00:00', '17:00:00'),
                ('Jumat', 5, 1, '08:00:00', '16:00:00'),
                ('Sabtu', 6, 0, '08:00:00', '12:00:00'),
                ('Minggu', 7, 0, '08:00:00', '17:00:00')`);
        }
        console.log('✔ weekday_settings (seeded)');

        // 13. Scan Product (log)
        await db.query(`
            CREATE TABLE IF NOT EXISTS scan_product_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_id INT NULL,
                product_name VARCHAR(255) NULL,
                product_code VARCHAR(100) NULL,
                customer_id INT NULL,
                scan_type VARCHAR(30) DEFAULT 'check',
                qty DECIMAL(15,2) DEFAULT 1,
                scan_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                note TEXT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✔ scan_product_log');

        console.log('--- ALL REMAINING SALES MASTER TABLES CREATED SUCCESSFULLY ---');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e.message);
        process.exit(1);
    }
};

run();
