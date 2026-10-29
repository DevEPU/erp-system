const db = require('../src/config/db');

async function run() {
  try {
    const [tipe] = await db.query('SELECT * FROM tipe_barang_jadi LIMIT 100');
    console.log('=== TIPE_BARANG_JADI ===');
    console.table(tipe);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
