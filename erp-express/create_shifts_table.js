const db = require('./src/config/db');

async function run() {
  try {
    console.log('=== CREATING SHIFTS TABLE ===');
    
    // 1. Create table
    await db.query(`
      CREATE TABLE IF NOT EXISTS shifts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        description TEXT NULL,
        is_active TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('- Table "shifts" created or already exists.');

    // 2. Seed default values
    const [existing] = await db.query('SELECT COUNT(*) as count FROM shifts');
    if (existing[0].count === 0) {
      await db.query(`
        INSERT INTO shifts (name, start_time, end_time, description, is_active) VALUES
        ('Shift 1 Pagi', '08:00:00', '16:00:00', 'Shift pagi utama', 1),
        ('Shift 2 Siang', '16:00:00', '00:00:00', 'Shift sore/siang utama', 1),
        ('Shift 3 Malam', '00:00:00', '08:00:00', 'Shift malam utama', 1)
      `);
      console.log('- Seeded default shifts successfully.');
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
