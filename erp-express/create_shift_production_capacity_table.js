const db = require('./src/config/db');

async function run() {
  try {
    console.log('=== CREATING SHIFT_PRODUCTION_CAPACITY TABLE ===');
    
    // Create the table to store simulation history/logs
    await db.query(`
      CREATE TABLE IF NOT EXISTS shift_production_capacity (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL,
        machine_id INT NOT NULL,
        mold_id INT NOT NULL,
        uph INT NOT NULL,
        shift_1_hours DECIMAL(4,2) DEFAULT 0.00,
        shift_2_hours DECIMAL(4,2) DEFAULT 0.00,
        shift_3_hours DECIMAL(4,2) DEFAULT 0.00,
        shift_1_target INT DEFAULT 0,
        shift_2_target INT DEFAULT 0,
        shift_3_target INT DEFAULT 0,
        working_days INT DEFAULT 25,
        daily_target INT DEFAULT 0,
        monthly_target INT DEFAULT 0,
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
        FOREIGN KEY (mold_id) REFERENCES molds(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('- Table "shift_production_capacity" created or already exists.');

    // Seed some initial capacity simulation logs for demo
    const [existing] = await db.query('SELECT COUNT(*) as count FROM shift_production_capacity');
    if (existing[0].count === 0) {
      const [mList] = await db.query('SELECT id, code FROM machines');
      const [moldList] = await db.query('SELECT id, code FROM molds');

      const m150 = mList.find(m => m.code === 'MC-INJ-150T');
      const m220 = mList.find(m => m.code === 'MC-INJ-220T');
      
      const moldHolder = moldList.find(m => m.code === 'MOLD-HOLDER-RH');
      const moldBracket = moldList.find(m => m.code === 'MOLD-BRK-LH');

      if (m150 && moldHolder) {
        await db.query(`
          INSERT INTO shift_production_capacity (date, machine_id, mold_id, uph, shift_1_hours, shift_2_hours, shift_3_hours, shift_1_target, shift_2_target, shift_3_target, working_days, daily_target, monthly_target, notes) VALUES
          (CURDATE(), ?, ?, 110, 7.00, 7.00, 7.00, 770, 770, 770, 25, 2310, 57750, 'Simulasi standar 3 shift penuh')
        `, [m150.id, moldHolder.id]);
      }

      if (m220 && moldBracket) {
        await db.query(`
          INSERT INTO shift_production_capacity (date, machine_id, mold_id, uph, shift_1_hours, shift_2_hours, shift_3_hours, shift_1_target, shift_2_target, shift_3_target, working_days, daily_target, monthly_target, notes) VALUES
          (CURDATE(), ?, ?, 130, 7.00, 6.00, 0.00, 910, 780, 0, 26, 1690, 43940, 'Simulasi 2 shift, shift sore dipersingkat')
        `, [m220.id, moldBracket.id]);
      }
      console.log('- Seeded initial capacity logs successfully.');
    } else {
      console.log('- Table "shift_production_capacity" already has data. Seeding skipped.');
    }

    console.log('=== SHIFT_PRODUCTION_CAPACITY MIGRATION COMPLETED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Migration Failed:', err);
  } finally {
    process.exit(0);
  }
}

run();
