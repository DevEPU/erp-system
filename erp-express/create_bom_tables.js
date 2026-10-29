const db = require('./src/config/db');

async function main() {
    try {
        console.log("=== CREATING BOM TABLES ===");

        // 1. Create boms table
        await db.query(`
            CREATE TABLE IF NOT EXISTS boms (
                id INT PRIMARY KEY AUTO_INCREMENT,
                bom_code VARCHAR(100) UNIQUE NOT NULL,
                bom_name VARCHAR(255) NOT NULL,
                description TEXT,
                username VARCHAR(100),
                status VARCHAR(20) DEFAULT 'Aktif',
                target_warehouse_id INT NULL,
                finished_good_code VARCHAR(100) NULL,
                finished_good_name VARCHAR(255) NULL,
                finished_good_unit VARCHAR(20) NULL,
                finished_good_qty DECIMAL(15,4) DEFAULT 1.0000,
                is_dismantling TINYINT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("- Table 'boms' created successfully.");

        // 2. Create bom_items table
        await db.query(`
            CREATE TABLE IF NOT EXISTS bom_items (
                id INT PRIMARY KEY AUTO_INCREMENT,
                bom_id INT NOT NULL,
                parent_item_id INT NULL,
                item_type VARCHAR(20) NOT NULL,
                warehouse_id INT NULL,
                product_code VARCHAR(100) NOT NULL,
                part_number VARCHAR(100) NULL,
                product_name VARCHAR(255) NOT NULL,
                qty DECIMAL(15,4) NOT NULL,
                unit VARCHAR(20) NULL,
                price DECIMAL(15,2) DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_bom_items_bom FOREIGN KEY (bom_id) REFERENCES boms(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("- Table 'bom_items' created successfully.");

        console.log("=== ALL BOM TABLES CREATED SUCCESSFULLY ===");
    } catch (err) {
        console.error("Migration Failed:", err);
    } finally {
        process.exit(0);
    }
}

main();
