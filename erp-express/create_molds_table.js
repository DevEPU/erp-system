const db = require('./src/config/db');

async function run() {
  try {
    console.log('=== RUNNING MOLD TABLE & PRO COLUMNS MIGRATION ===');
    
    // 1. Create molds table
    await db.query(`
      CREATE TABLE IF NOT EXISTS molds (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        is_active TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('- Table "molds" created or already exists.');

    // 2. Seed initial molds
    const [existing] = await db.query('SELECT COUNT(*) as count FROM molds');
    if (existing[0].count === 0) {
      await db.query(`
        INSERT INTO molds (code, name, description, is_active) VALUES
        ('MOLD-HOLDER-RH', 'Mold Holder Mirror RH 29702', 'Cetakan untuk Holder Mirror Kanan', 1),
        ('MOLD-BRK-LH', 'Mold Mirror Bracket LH 29701', 'Cetakan untuk Mirror Bracket Kiri', 1),
        ('MOLD-HSG-LH', 'Mold Housing Mirror Out LH', 'Cetakan untuk Housing Mirror Luar Kiri', 1),
        ('MOLD-LOK-BTN', 'Mold Lock Button Assy Back Door', 'Cetakan untuk Tombol Lock Pintu Belakang', 1)
      `);
      console.log('- Seeded initial molds successfully.');
    } else {
      console.log('- Table "molds" already has data. Seeding skipped.');
    }

    // 3. Alter planning_produksi columns
    const [cols] = await db.query('DESCRIBE planning_produksi');
    const hasCol = (name) => cols.some(c => c.Field === name);

    if (!hasCol('order_sheet_id')) {
        await db.query('ALTER TABLE planning_produksi ADD COLUMN order_sheet_id BIGINT UNSIGNED NULL');
        console.log('- Column "order_sheet_id" added to planning_produksi.');
    } else {
        console.log('- Column "order_sheet_id" already exists.');
    }

    if (!hasCol('product_id')) {
        await db.query('ALTER TABLE planning_produksi ADD COLUMN product_id BIGINT UNSIGNED NULL');
        console.log('- Column "product_id" added to planning_produksi.');
    } else {
        console.log('- Column "product_id" already exists.');
    }

    if (!hasCol('mold_id')) {
        await db.query('ALTER TABLE planning_produksi ADD COLUMN mold_id BIGINT UNSIGNED NULL');
        console.log('- Column "mold_id" added to planning_produksi.');
    } else {
        console.log('- Column "mold_id" already exists.');
    }

    console.log('=== MIGRATION COMPLETED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Migration Failed:', err);
  } finally {
    process.exit(0);
  }
}

run();
