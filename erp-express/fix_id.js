const db = require('./src/config/db');

async function run() {
  try {
    console.log('=== FIXING AUTO_INCREMENT GAP ===');
    
    // 1. Update ID 4 to 3
    const [updateRes] = await db.query('UPDATE tipe_barang_jadi SET id = 3 WHERE id = 4');
    console.log('- Updated ID 4 to 3:', updateRes.affectedRows, 'row(s) affected.');

    // 2. Reset AUTO_INCREMENT to 4
    await db.query('ALTER TABLE tipe_barang_jadi AUTO_INCREMENT = 4');
    console.log('- Reset AUTO_INCREMENT counter to 4.');

    console.log('=== FIX COMPLETED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Fix Failed:', err);
  } finally {
    process.exit(0);
  }
}

run();
