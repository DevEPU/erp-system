const db = require('../src/config/db');

async function main() {
    try {
        console.log("=== CREATING CUSTOMER CLAIMS TABLE ===");

        await db.query(`
            CREATE TABLE IF NOT EXISTS customer_claims (
                id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
                claim_code VARCHAR(255) NOT NULL,
                customer_id BIGINT UNSIGNED NOT NULL,
                product_id BIGINT UNSIGNED NOT NULL,
                qty_claimed INT NOT NULL,
                claim_date DATE NOT NULL,
                ng_type VARCHAR(255) NULL,
                notes TEXT NULL,
                status VARCHAR(50) DEFAULT 'PENDING',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("- Table 'customer_claims' created successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Migration Failed:", err);
        process.exit(1);
    }
}

main();
