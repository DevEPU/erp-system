const db = require('../src/config/db.js');

async function migrate() {
  console.log("=== STARTING MRP QUOTA ARRANGEMENT DB MIGRATION ===");
  try {
    const addColumn = async (table, column, definition) => {
      try {
        const [cols] = await db.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
        if (cols.length === 0) {
          await db.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
          console.log(`[SUCCESS] Added column '${column}' to table '${table}'`);
        } else {
          console.log(`[SKIP] Column '${column}' already exists in table '${table}'`);
        }
      } catch (err) {
        console.error(`[ERROR] Failed to add column '${column}' to table '${table}':`, err.message);
      }
    };

    console.log("\n--- 1. Migrating product_suppliers Table ---");
    await addColumn('product_suppliers', 'allocation_percent', 'DECIMAL(5,2) DEFAULT 0.00 AFTER is_primary');

    console.log("\n--- 2. Migrating mrp_details Table ---");
    await addColumn('mrp_details', 'allocation_percent', 'DECIMAL(5,2) DEFAULT 0.00 AFTER part_name_vendor');

    console.log("\n=== MIGRATION COMPLETED SUCCESSFULLY ===");
    process.exit(0);
  } catch (err) {
    console.error("Migration Fatal Error:", err);
    process.exit(1);
  }
}

migrate();
