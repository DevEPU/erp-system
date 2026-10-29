const db = require('./src/config/db');

async function run() {
  try {
    console.log('=== CREATING TIPE BARANG JADI TABLE ===');
    
    // 1. Create table
    await db.query(`
      CREATE TABLE IF NOT EXISTS tipe_barang_jadi (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT NULL,
        is_active TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('- Table "tipe_barang_jadi" created or already exists.');

    // 2. Seed default values: FG & WIP
    const [existing] = await db.query('SELECT COUNT(*) as count FROM tipe_barang_jadi');
    if (existing[0].count === 0) {
      await db.query(`
        INSERT INTO tipe_barang_jadi (code, name, description, is_active) VALUES
        ('FG', 'Finished Good', 'Barang Jadi Hasil Produksi Akhir', 1),
        ('WIP', 'Work in Progress', 'Barang Setengah Jadi untuk Perakitan Lanjutan', 1)
      `);
      console.log('- Seeded default values (FG, WIP) successfully.');
    } else {
      console.log('- Table already has data. Seeding skipped.');
    }

    console.log('=== MIGRATION COMPLETED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Migration Failed:', err);
  } finally {
    process.exit(0);
  }
}

run();
