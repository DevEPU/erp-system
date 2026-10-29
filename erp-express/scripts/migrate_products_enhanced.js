const db = require('../src/config/db');

async function migrate() {
    try {
        // 1. Add columns to products
        console.log("Checking products table columns...");
        const [columns] = await db.execute("SHOW COLUMNS FROM products");
        const columnNames = columns.map(c => c.Field);

        if (!columnNames.includes('product_type')) {
            console.log("Adding product_type column...");
            await db.execute("ALTER TABLE products ADD COLUMN product_type VARCHAR(100) AFTER product_name");
        }
        if (!columnNames.includes('bom_code')) {
            console.log("Adding bom_code column...");
            await db.execute("ALTER TABLE products ADD COLUMN bom_code VARCHAR(100) AFTER product_type");
        }

        // 2. Create product_units table
        console.log("Creating product_units table...");
        await db.execute(`
            CREATE TABLE IF NOT EXISTS product_units (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                product_id BIGINT UNSIGNED NOT NULL,
                level INT NOT NULL,
                barcode VARCHAR(100),
                unit_code VARCHAR(100),
                tax_unit VARCHAR(100),
                conversion_qty DECIMAL(15, 4) DEFAULT 1.0000,
                color VARCHAR(100),
                buy_price DECIMAL(20, 2) DEFAULT 0.00,
                sell_price DECIMAL(20, 2) DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            )
        `);

        // 3. Create product_locations table
        console.log("Creating product_locations table...");
        await db.execute(`
            CREATE TABLE IF NOT EXISTS product_locations (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                product_id BIGINT UNSIGNED NOT NULL,
                warehouse_id INT,
                aisle VARCHAR(100),
                min_qty DECIMAL(15, 4) DEFAULT 0.0000,
                max_qty DECIMAL(15, 4) DEFAULT 0.0000,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL
            )
        `);

        console.log("Migration completed successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();
