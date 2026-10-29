const db = require('./src/config/db');

async function run() {
  try {
    console.log('=== CREATING MACHINE_MOLD_UPH TABLE ===');
    
    // Create the UPH matrix table
    await db.query(`
      CREATE TABLE IF NOT EXISTS machine_mold_uph (
        id INT AUTO_INCREMENT PRIMARY KEY,
        machine_id INT NOT NULL,
        mold_id INT NOT NULL,
        uph INT NOT NULL,
        cavity INT DEFAULT 1,
        is_primary TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_machine_mold (machine_id, mold_id),
        FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
        FOREIGN KEY (mold_id) REFERENCES molds(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('- Table "machine_mold_uph" created or already exists.');

    // Seed default combinations
    const [existing] = await db.query('SELECT COUNT(*) as count FROM machine_mold_uph');
    if (existing[0].count === 0) {
      // Fetch machines
      const [mList] = await db.query('SELECT id, code FROM machines');
      // Fetch molds
      const [moldList] = await db.query('SELECT id, code FROM molds');

      const m150 = mList.find(m => m.code === 'MC-INJ-150T');
      const m220 = mList.find(m => m.code === 'MC-INJ-220T');
      const m350 = mList.find(m => m.code === 'MC-INJ-350T');

      const moldHolder = moldList.find(m => m.code === 'MOLD-HOLDER-RH');
      const moldBracket = moldList.find(m => m.code === 'MOLD-BRK-LH');
      const moldHousing = moldList.find(m => m.code === 'MOLD-HSG-LH');
      const moldLock = moldList.find(m => m.code === 'MOLD-LOK-BTN');

      const seeds = [];
      
      // Seed pairings with UPH values
      if (m150 && moldHolder) seeds.push([m150.id, moldHolder.id, 110, 4, 1]); // MC-INJ-150T + Mold Holder -> UPH: 110, Cavity: 4, Primary: 1
      if (m220 && moldHolder) seeds.push([m220.id, moldHolder.id, 120, 4, 0]); // MC-INJ-220T + Mold Holder -> UPH: 120, Cavity: 4, Backup: 1

      if (m220 && moldBracket) seeds.push([m220.id, moldBracket.id, 130, 2, 1]); // MC-INJ-220T + Mold Bracket -> UPH: 130, Cavity: 2, Primary: 1
      if (m150 && moldBracket) seeds.push([m150.id, moldBracket.id, 115, 2, 0]); // MC-INJ-150T + Mold Bracket -> UPH: 115, Cavity: 2, Backup: 1

      if (m350 && moldHousing) seeds.push([m350.id, moldHousing.id, 95,  2, 1]); // MC-INJ-350T + Mold Housing -> UPH: 95, Cavity: 2, Primary: 1
      if (m220 && moldHousing) seeds.push([m220.id, moldHousing.id, 105, 2, 0]); // MC-INJ-220T + Mold Housing -> UPH: 105, Cavity: 2, Backup: 1

      if (m150 && moldLock) seeds.push([m150.id, moldLock.id, 140, 8, 1]); // MC-INJ-150T + Mold Lock -> UPH: 140, Cavity: 8, Primary: 1

      for (const row of seeds) {
        await db.query(
          'INSERT INTO machine_mold_uph (machine_id, mold_id, uph, cavity, is_primary) VALUES (?, ?, ?, ?, ?)',
          row
        );
      }
      console.log(`- Seeded ${seeds.length} initial Machine-Mold UPH entries.`);
    } else {
      console.log('- Table "machine_mold_uph" already has data. Seeding skipped.');
    }

    console.log('=== MACHINE_MOLD_UPH MIGRATION COMPLETED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Migration Failed:', err);
  } finally {
    process.exit(0);
  }
}

run();
