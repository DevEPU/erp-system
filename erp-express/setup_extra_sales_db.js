const db = require('./src/config/db');

const run = async () => {
    try {
        console.log('--- STARTING EXTRA SALES TABLES MIGRATION ---');

        // 1. Tutup Pending SO
        await db.query(`
            CREATE TABLE IF NOT EXISTS tutup_pending_so (
                id INT AUTO_INCREMENT PRIMARY KEY,
                reference VARCHAR(50) NOT NULL UNIQUE,
                customer_id INT NULL,
                so_reference VARCHAR(100) NULL,
                reason TEXT NULL,
                date DATE NOT NULL,
                status VARCHAR(20) DEFAULT 'Approved',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✔ Table tutup_pending_so created');

        // 2. Transaksi A.R.
        await db.query(`
            CREATE TABLE IF NOT EXISTS transaksi_ar (
                id INT AUTO_INCREMENT PRIMARY KEY,
                reference VARCHAR(50) NOT NULL UNIQUE,
                customer_id INT NULL,
                invoice_reference VARCHAR(100) NULL,
                amount DECIMAL(15,2) DEFAULT 0,
                payment_method VARCHAR(50) NULL,
                date DATE NOT NULL,
                note TEXT NULL,
                status VARCHAR(20) DEFAULT 'Draft',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✔ Table transaksi_ar created');

        // 3. Surat Jalan
        await db.query(`
            CREATE TABLE IF NOT EXISTS surat_jalan (
                id INT AUTO_INCREMENT PRIMARY KEY,
                reference VARCHAR(50) NOT NULL UNIQUE,
                customer_id INT NULL,
                order_sheet_ref VARCHAR(100) NULL,
                driver_name VARCHAR(100) NULL,
                vehicle_no VARCHAR(20) NULL,
                delivery_date DATE NOT NULL,
                note TEXT NULL,
                status VARCHAR(20) DEFAULT 'Draft',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        await db.query(`
            CREATE TABLE IF NOT EXISTS surat_jalan_details (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sj_id INT NOT NULL,
                product_id INT NULL,
                product_name VARCHAR(255) NOT NULL,
                product_code VARCHAR(100) NULL,
                product_unit VARCHAR(50) NULL,
                qty_delivered DECIMAL(15,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (sj_id) REFERENCES surat_jalan(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✔ Table surat_jalan & details created');

        // 4. Retur Surat Jalan
        await db.query(`
            CREATE TABLE IF NOT EXISTS retur_surat_jalan (
                id INT AUTO_INCREMENT PRIMARY KEY,
                reference VARCHAR(50) NOT NULL UNIQUE,
                customer_id INT NULL,
                sj_reference VARCHAR(100) NULL,
                return_date DATE NOT NULL,
                reason TEXT NULL,
                status VARCHAR(20) DEFAULT 'Draft',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        await db.query(`
            CREATE TABLE IF NOT EXISTS retur_surat_jalan_details (
                id INT AUTO_INCREMENT PRIMARY KEY,
                retur_id INT NOT NULL,
                product_id INT NULL,
                product_name VARCHAR(255) NOT NULL,
                product_code VARCHAR(100) NULL,
                product_unit VARCHAR(50) NULL,
                qty_returned DECIMAL(15,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (retur_id) REFERENCES retur_surat_jalan(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✔ Table retur_surat_jalan & details created');

        // 5. Penjualan Via S.J.
        await db.query(`
            CREATE TABLE IF NOT EXISTS penjualan_via_sj (
                id INT AUTO_INCREMENT PRIMARY KEY,
                reference VARCHAR(50) NOT NULL UNIQUE,
                customer_id INT NULL,
                sj_reference VARCHAR(100) NULL,
                date DATE NOT NULL,
                note TEXT NULL,
                status VARCHAR(20) DEFAULT 'Draft',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        await db.query(`
            CREATE TABLE IF NOT EXISTS penjualan_via_sj_details (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sales_id INT NOT NULL,
                product_id INT NULL,
                product_name VARCHAR(255) NOT NULL,
                product_code VARCHAR(100) NULL,
                product_unit VARCHAR(50) NULL,
                qty DECIMAL(15,2) DEFAULT 0,
                price DECIMAL(15,2) DEFAULT 0,
                sub_total DECIMAL(15,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (sales_id) REFERENCES penjualan_via_sj(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✔ Table penjualan_via_sj & details created');

        // 6. Penjualan Via S.O.
        await db.query(`
            CREATE TABLE IF NOT EXISTS penjualan_via_so (
                id INT AUTO_INCREMENT PRIMARY KEY,
                reference VARCHAR(50) NOT NULL UNIQUE,
                customer_id INT NULL,
                order_sheet_ref VARCHAR(100) NULL,
                date DATE NOT NULL,
                note TEXT NULL,
                status VARCHAR(20) DEFAULT 'Draft',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        await db.query(`
            CREATE TABLE IF NOT EXISTS penjualan_via_so_details (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sales_id INT NOT NULL,
                product_id INT NULL,
                product_name VARCHAR(255) NOT NULL,
                product_code VARCHAR(100) NULL,
                product_unit VARCHAR(50) NULL,
                qty DECIMAL(15,2) DEFAULT 0,
                price DECIMAL(15,2) DEFAULT 0,
                sub_total DECIMAL(15,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (sales_id) REFERENCES penjualan_via_so(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✔ Table penjualan_via_so & details created');

        // 7. Penjualan Langsung
        await db.query(`
            CREATE TABLE IF NOT EXISTS penjualan_langsung (
                id INT AUTO_INCREMENT PRIMARY KEY,
                reference VARCHAR(50) NOT NULL UNIQUE,
                customer_id INT NULL,
                date DATE NOT NULL,
                note TEXT NULL,
                status VARCHAR(20) DEFAULT 'Draft',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        await db.query(`
            CREATE TABLE IF NOT EXISTS penjualan_langsung_details (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sales_id INT NOT NULL,
                product_id INT NULL,
                product_name VARCHAR(255) NOT NULL,
                product_code VARCHAR(100) NULL,
                product_unit VARCHAR(50) NULL,
                qty DECIMAL(15,2) DEFAULT 0,
                price DECIMAL(15,2) DEFAULT 0,
                sub_total DECIMAL(15,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (sales_id) REFERENCES penjualan_langsung(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✔ Table penjualan_langsung & details created');

        console.log('--- EXTRA SALES TABLES MIGRATION COMPLETED SUCCESSFULLY ---');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
};

run();
