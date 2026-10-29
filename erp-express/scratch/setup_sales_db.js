const db = require('../src/config/db');

async function setup() {
    try {
        console.log('Checking and setting up tables for Customer & Sales...');

        // 1. customer_forecasts
        await db.query(`
            CREATE TABLE IF NOT EXISTS customer_forecasts (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                reference VARCHAR(255) NOT NULL UNIQUE,
                customer_id BIGINT UNSIGNED NULL,
                month INT NULL,
                year INT NULL,
                note TEXT NULL,
                status VARCHAR(50) DEFAULT 'Draft',
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('Table customer_forecasts verified.');

        // 2. customer_forecast_details
        await db.query(`
            CREATE TABLE IF NOT EXISTS customer_forecast_details (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                forecast_id BIGINT UNSIGNED NOT NULL,
                product_id BIGINT UNSIGNED NULL,
                product_name VARCHAR(255) NOT NULL,
                product_code VARCHAR(255) NULL,
                product_unit VARCHAR(50) NULL,
                forecast_qty INT NOT NULL DEFAULT 0,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (forecast_id) REFERENCES customer_forecasts(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('Table customer_forecast_details verified.');

        // 3. customer_po
        await db.query(`
            CREATE TABLE IF NOT EXISTS customer_po (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                reference VARCHAR(255) NOT NULL UNIQUE,
                customer_id BIGINT UNSIGNED NULL,
                no_po_customer VARCHAR(255) NULL,
                tanggal_po DATE NULL,
                delivery_date DATE NULL,
                total_qty INT NOT NULL DEFAULT 0,
                note TEXT NULL,
                status VARCHAR(50) DEFAULT 'Draft',
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('Table customer_po verified.');

        // 4. customer_po_details
        await db.query(`
            CREATE TABLE IF NOT EXISTS customer_po_details (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                po_id BIGINT UNSIGNED NOT NULL,
                forecast_detail_id BIGINT UNSIGNED NULL,
                product_id BIGINT UNSIGNED NULL,
                product_name VARCHAR(255) NOT NULL,
                product_code VARCHAR(255) NULL,
                product_unit VARCHAR(50) NULL,
                po_qty INT NOT NULL DEFAULT 0,
                price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                sub_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (po_id) REFERENCES customer_po(id) ON DELETE CASCADE,
                FOREIGN KEY (forecast_detail_id) REFERENCES customer_forecast_details(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('Table customer_po_details verified.');

        // 5. order_sheets
        await db.query(`
            CREATE TABLE IF NOT EXISTS order_sheets (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                reference VARCHAR(255) NOT NULL UNIQUE,
                customer_id BIGINT UNSIGNED NULL,
                period_month INT NULL,
                period_year INT NULL,
                delivery_date DATE NULL,
                total_qty INT NOT NULL DEFAULT 0,
                note TEXT NULL,
                status VARCHAR(50) DEFAULT 'Draft',
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('Table order_sheets verified.');

        // 6. order_sheet_details
        await db.query(`
            CREATE TABLE IF NOT EXISTS order_sheet_details (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                os_id BIGINT UNSIGNED NOT NULL,
                po_detail_id BIGINT UNSIGNED NULL,
                product_id BIGINT UNSIGNED NULL,
                product_name VARCHAR(255) NOT NULL,
                product_code VARCHAR(255) NULL,
                product_unit VARCHAR(50) NULL,
                os_qty INT NOT NULL DEFAULT 0,
                price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                sub_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (os_id) REFERENCES order_sheets(id) ON DELETE CASCADE,
                FOREIGN KEY (po_detail_id) REFERENCES customer_po_details(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('Table order_sheet_details verified.');

        console.log('Database tables setup successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error setting up database tables:', err);
        process.exit(1);
    }
}

setup();
