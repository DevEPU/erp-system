const db = require('../src/config/db.js');

async function migrate() {
  console.log("=== STARTING ENTERPRISE MASTER DATA DB MIGRATION ===");
  try {
    // Helper to add column safely
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

    console.log("\n--- 1. Migrating Categories Table ---");
    await addColumn('categories', 'parent_id', 'BIGINT UNSIGNED NULL AFTER id');
    await addColumn('categories', 'valuation_method', "VARCHAR(50) DEFAULT 'AVCO' AFTER category_name");
    await addColumn('categories', 'description', 'TEXT NULL AFTER valuation_method');
    await addColumn('categories', 'is_active', 'TINYINT(1) DEFAULT 1 AFTER description');

    console.log("\n--- 2. Migrating Products Table ---");
    await addColumn('products', 'brand', 'VARCHAR(255) NULL AFTER product_name');
    await addColumn('products', 'barcode', 'VARCHAR(255) NULL AFTER product_code');
    await addColumn('products', 'hsn_sat_code', 'VARCHAR(100) NULL AFTER tax_item_code');
    await addColumn('products', 'purchase_price', 'DECIMAL(15,2) DEFAULT 0.00 AFTER product_price');
    await addColumn('products', 'weight_kg', 'DECIMAL(10,3) DEFAULT 0.000 AFTER purchase_price');
    await addColumn('products', 'volume_m3', 'DECIMAL(10,4) DEFAULT 0.0000 AFTER weight_kg');
    await addColumn('products', 'shelf_life_days', 'INT DEFAULT 0 AFTER volume_m3');
    await addColumn('products', 'lead_time_days', 'INT DEFAULT 0 AFTER shelf_life_days');
    await addColumn('products', 'valuation_method', "VARCHAR(50) DEFAULT 'AVCO' AFTER lead_time_days");

    console.log("\n--- 3. Migrating Warehouses Table ---");
    await addColumn('warehouses', 'warehouse_type', "VARCHAR(50) DEFAULT 'INTERNAL' AFTER short_name");
    await addColumn('warehouses', 'address', 'TEXT NULL AFTER warehouse_type');
    await addColumn('warehouses', 'city', 'VARCHAR(100) NULL AFTER address');
    await addColumn('warehouses', 'pic_name', 'VARCHAR(255) NULL AFTER city');
    await addColumn('warehouses', 'pic_phone', 'VARCHAR(50) NULL AFTER pic_name');
    await addColumn('warehouses', 'capacity_m3', 'DECIMAL(15,2) DEFAULT 0.00 AFTER pic_phone');
    await addColumn('warehouses', 'allow_negative_stock', 'TINYINT(1) DEFAULT 0 AFTER capacity_m3');

    console.log("\n=== MIGRATION COMPLETED SUCCESSFULLY ===");
    process.exit(0);
  } catch (err) {
    console.error("Migration Fatal Error:", err);
    process.exit(1);
  }
}

migrate();
