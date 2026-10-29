const db = require('./src/config/db');

async function run() {
  try {
    console.log('=== CREATING MACHINES TABLE ===');
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS machines (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        line VARCHAR(255) NULL,
        capacity VARCHAR(255) NULL,
        status VARCHAR(100) DEFAULT 'Idle',
        is_active TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('- Table "machines" created or already exists.');

    const [existing] = await db.query('SELECT COUNT(*) as count FROM machines');
    if (existing[0].count === 0) {
      await db.query(`
        INSERT INTO machines (code, name, type, line, capacity, status, is_active) VALUES
        ('MC-INJ-150T', 'Injection 150T - Toshiba', 'Injection', 'Line Injection 1', '110 Pcs/Jam', 'Idle', 1),
        ('MC-INJ-220T', 'Injection 220T - Haitian', 'Injection', 'Line Injection 1', '120 Pcs/Jam', 'Running', 1),
        ('MC-INJ-350T', 'Injection 350T - Nissei', 'Injection', 'Line Injection 2', '95 Pcs/Jam', 'Idle', 1),
        ('MC-CNC-YCM', 'CNC Milling YCM', 'CNC', 'Line Workshop Mold', '35 Pcs/Jam', 'Idle', 1),
        ('MC-ASS-LINE-A', 'Assembly Line A', 'Assembly', 'Line Assembly 1', '50 Pcs/Jam', 'Running', 1),
        ('MC-ASS-LINE-B', 'Assembly Line B', 'Assembly', 'Line Assembly 1', '60 Pcs/Jam', 'Idle', 1)
      `);
      console.log('- Seeded initial machines successfully.');
    } else {
      console.log('- Table "machines" already has data. Seeding skipped.');
    }

    console.log('=== MACHINES MIGRATION COMPLETED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Migration Failed:', err);
  } finally {
    process.exit(0);
  }
}

run();
