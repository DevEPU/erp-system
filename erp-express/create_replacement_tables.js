const db = require('./src/config/db');

async function main() {
    try {
        console.log("=== CREATING REPLACEMENT & VENDOR CLAIM TABLES ===");

        // 1. Create vendor_claims table
        await db.query(`
            CREATE TABLE IF NOT EXISTS vendor_claims (
                id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
                production_output_id BIGINT UNSIGNED NOT NULL,
                product_id BIGINT UNSIGNED NOT NULL,
                qty_ng_component INT NOT NULL,
                status VARCHAR(50) DEFAULT 'QUARANTINED',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("- Table 'vendor_claims' created successfully.");

        // 2. Create material_issuance_replacements table
        await db.query(`
            CREATE TABLE IF NOT EXISTS material_issuance_replacements (
                id INT PRIMARY KEY AUTO_INCREMENT,
                wo_id BIGINT UNSIGNED NOT NULL,
                product_id BIGINT UNSIGNED NOT NULL,
                qty_requested DECIMAL(15,2) NOT NULL,
                status VARCHAR(50) DEFAULT 'PENDING',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("- Table 'material_issuance_replacements' created successfully.");

        console.log("=== ALL REPLACEMENT TABLES CREATED SUCCESSFULLY ===");
        process.exit(0);
    } catch (err) {
        console.error("Migration Failed:", err);
        process.exit(1);
    }
}

main();
