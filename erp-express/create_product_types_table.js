const db = require('./src/config/db');

async function run() {
  try {
    console.log('=== CREATING PRODUCT TYPES TABLE ===');
    
    // 1. Create table
    await db.query(`
      CREATE TABLE IF NOT EXISTS product_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT NULL,
        is_active TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('- Table "product_types" created or already exists.');

    // 2. Seed default values
    const [existing] = await db.query('SELECT COUNT(*) as count FROM product_types');
    if (existing[0].count === 0) {
      await db.query(`
        INSERT INTO product_types (name, description, is_active) VALUES
        ('Raw Material', 'Bahan Baku Mentah', 1),
        ('Finished Good', 'Barang Jadi Hasil Produksi Akhir', 1),
        ('Semi Finished', 'Barang Setengah Jadi', 1),
        ('Jasa', 'Layanan Jasa', 1),
        ('Biaya', 'Alokasi Biaya', 1),
        ('Paket', 'Barang Paket/Kombinasi', 1),
        ('Asset', 'Aktiva Tetap/Asset Perusahaan', 1),
        ('Consumable', 'Barang Habis Pakai', 1),
        ('Component', 'Komponen Pendukung', 1),
        ('Packaging', 'Bahan Kemasan/Packaging', 1),
        ('Sticker', 'Label/Stiker Produk', 1)
      `);
      console.log('- Seeded default values successfully.');
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
