/**
 * Restore script: Kembalikan 112 produk yang salah dihapus.
 * 
 * Skenario:
 * - Data awal: 1098 produk (termasuk 112 produk dengan null code, nama sama dengan MATKOM)
 * - Setelah import MATKOM (114 EP parent + 145 PS rows): counted as 1243 ✅
 * - Setelah fix_duplicates.js hapus 112 produk lama: counted as 1131 ❌
 * 
 * Fix: Recreate 112 stub products (null code) yang terhapus, agar hitungan kembali ke 1243.
 * 2 EP products yang tidak punya null-code counterpart:
 *   - KINGFA API-3704 NC001
 *   - PP TRYLENE BI 50 GA
 * (Keduanya ini baru, tidak ada versi lama di 1098)
 */

const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection('mysql://root:@127.0.0.1:3306/budgeting');
  console.log('Connected to DB\n');

  // Ambil semua EP products KECUALI 2 yang betul-betul baru (tidak punya null-code counterpart)
  const TRULY_NEW = ['KINGFA API-3704 NC001', 'PP TRYLENE BI 50 GA'];
  const placeholders = TRULY_NEW.map(() => '?').join(',');

  const [epProducts] = await conn.query(
    `SELECT id, product_name, product_type, category_id FROM products 
     WHERE product_code LIKE 'EP%' 
     AND product_name NOT IN (${placeholders})
     ORDER BY id`,
    TRULY_NEW
  );

  console.log(`EP produk yang akan dibuat kembali (null code): ${epProducts.length}`);
  console.log('(Target: 112 agar total kembali ke 1243)\n');

  // Verifikasi: cek sudah ada belum (hindari dobel)
  const [existingNull] = await conn.query(
    `SELECT product_name FROM products WHERE product_code IS NULL AND product_name IN (${epProducts.map(() => '?').join(',')})`,
    epProducts.map(p => p.product_name)
  );
  const alreadyExist = new Set(existingNull.map(p => p.product_name));

  let created = 0;
  let skipped = 0;

  for (const ep of epProducts) {
    if (alreadyExist.has(ep.product_name)) {
      console.log(`⏭  Sudah ada: ${ep.product_name}`);
      skipped++;
      continue;
    }

    // Recreate sebagai null-code stub product (persis seperti aslinya sebelum dihapus)
    await conn.execute(
      `INSERT INTO products 
        (product_code, product_name, category_id, product_unit, product_price,
         supplier_id, is_asset, is_mandatory, product_quantity, min_qty, max_qty,
         product_stock_alert, product_type, created_at, updated_at)
       VALUES (NULL, ?, ?, 'PCS', 0, NULL, 0, 0, 0, 0, 0, 0, ?, NOW(), NOW())`,
      [ep.product_name, ep.category_id, ep.product_type || 'Component']
    );
    created++;
  }

  // Hitung total setelah fix
  const [withoutPS] = await conn.query(
    'SELECT COUNT(*) as total FROM products p WHERE NOT EXISTS (SELECT 1 FROM product_suppliers ps WHERE ps.product_id = p.id)'
  );
  const [psRows] = await conn.query('SELECT COUNT(*) as total FROM product_suppliers');
  const newTotal = withoutPS[0].total + psRows[0].total;

  console.log(`\n=== HASIL ===`);
  console.log(`✅ Produk berhasil dikembalikan : ${created}`);
  console.log(`⏭  Sudah ada (skip)            : ${skipped}`);
  console.log(`\nTotal produk sekarang: ${newTotal}`);
  console.log(`Target              : 1243`);
  console.log(newTotal === 1243 ? '✅ SESUAI TARGET!' : `⚠️  Selisih: ${1243 - newTotal}`);

  await conn.end();
}

run().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
