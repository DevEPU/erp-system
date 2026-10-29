const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection('mysql://root:@127.0.0.1:3306/budgeting');
  console.log('Connected to DB\n');

  // Ambil semua nama EP products (kecuali 2 yang benar-benar baru)
  const TRULY_NEW = ['KINGFA API-3704 NC001', 'PP TRYLENE BI 50 GA'];
  const placeholders = TRULY_NEW.map(() => '?').join(',');

  const [epProducts] = await conn.query(
    `SELECT DISTINCT product_name FROM products 
     WHERE product_code LIKE 'EP%' 
     AND product_name NOT IN (${placeholders})`,
    TRULY_NEW
  );

  const epNames = epProducts.map(p => p.product_name);
  if (epNames.length === 0) {
    console.log('Tidak ada produk EP yang ditemukan untuk referensi pencocokan.');
    await conn.end();
    return;
  }

  console.log(`Mencari stub produk (null-code) untuk dihapus berdasarkan ${epNames.length} nama produk EP...`);

  // Hapus produk dengan product_code IS NULL yang namanya ada di daftar epNames
  const namePlaceholders = epNames.map(() => '?').join(',');
  const [result] = await conn.query(
    `DELETE FROM products 
     WHERE product_code IS NULL 
     AND product_name IN (${namePlaceholders})`,
    epNames
  );

  console.log(`✅ Berhasil menghapus ${result.affectedRows} produk.`);

  // Hitung total produk sekarang
  const [withoutPS] = await conn.query(
    'SELECT COUNT(*) as total FROM products p WHERE NOT EXISTS (SELECT 1 FROM product_suppliers ps WHERE ps.product_id = p.id)'
  );
  const [psRows] = await conn.query('SELECT COUNT(*) as total FROM product_suppliers');
  const newTotal = withoutPS[0].total + psRows[0].total;

  console.log(`Total produk sekarang: ${newTotal}`);

  await conn.end();
}

run().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
