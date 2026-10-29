const db = require('../src/config/db');

(async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS \`vendor_daily_schedules\` (
              \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
              \`supplier_id\` BIGINT UNSIGNED NOT NULL,
              \`product_id\` BIGINT UNSIGNED NOT NULL,
              \`po_no_1\` VARCHAR(255) NULL,
              \`po_no_2\` VARCHAR(255) NULL,
              \`po_qty_1\` INT DEFAULT 0,
              \`po_qty_2\` INT DEFAULT 0,
              \`schedule_date\` DATE NOT NULL,
              \`schedule_qty\` INT DEFAULT 0,
              \`manual_actual_qty\` INT NULL,
              \`notes\` TEXT NULL,
              \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              UNIQUE KEY \`idx_sup_prod_date\` (\`supplier_id\`, \`product_id\`, \`schedule_date\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('SUCCESS: Table vendor_daily_schedules created successfully!');
    } catch(err) {
        console.error(err);
    }
    process.exit(0);
})();
