const db = require('../config/db');

async function run() {
  try {
    const [types] = await db.execute('SELECT DISTINCT product_type FROM products');
    console.log('--- Distinct Product Types in products table ---');
    console.log(types);

    const [tipeBarangJadi] = await db.execute('SELECT * FROM tipe_barang_jadi');
    console.log('--- tipe_barang_jadi table rows ---');
    console.log(tipeBarangJadi);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
