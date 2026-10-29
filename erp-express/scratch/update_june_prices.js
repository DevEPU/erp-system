const mysql = require('mysql2/promise');
const XLSX = require('xlsx');

const EXCEL_PATH = 'C:/laragon/www/erp-epu-main/06. Jun MD Vendor 1.xlsx';

async function run() {
  const conn = await mysql.createConnection('mysql://root:@127.0.0.1:3306/budgeting');
  console.log('✅ Connected to database\n');

  // --- Load Excel ---
  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets['4. MD Vendor'];
  const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const rows = rawData.slice(3).filter(r => r[3] && r[4] && r[5]);

  console.log(`📊 Excel rows to process: ${rows.length}`);

  // Begin transaction
  await conn.beginTransaction();

  let psUpdatedCount = 0;
  let productsUpdatedCount = 0;
  let unitsUpdatedCount = 0;

  try {
    for (const r of rows) {
      const partNo = String(r[3]).trim();
      const partName = String(r[4]).trim();
      const junePrice = Number(r[48]); // Column index 48

      // Find matching product_supplier row
      const [psMatch] = await conn.query(
        `SELECT id, product_id, is_primary FROM product_suppliers 
         WHERE supplier_part_number = ? AND product_name = ?`,
        [partNo, partName]
      );

      if (psMatch.length === 0) {
        console.warn(`⚠️  No product_supplier record found for Part Number: "${partNo}", Name: "${partName}"`);
        continue;
      }

      for (const ps of psMatch) {
        // Update product_supplier purchase_price
        const [psResult] = await conn.execute(
          `UPDATE product_suppliers SET purchase_price = ?, updated_at = NOW() WHERE id = ?`,
          [junePrice, ps.id]
        );
        psUpdatedCount += psResult.affectedRows;

        // If this is the primary supplier, update the main product price and level 1 product unit price
        if (ps.is_primary === 1) {
          // Update product_price in products table (it is stored as int, so round it just in case)
          const roundedPrice = Math.round(junePrice);
          const [prodResult] = await conn.execute(
            `UPDATE products SET product_price = ?, updated_at = NOW() WHERE id = ?`,
            [roundedPrice, ps.product_id]
          );
          productsUpdatedCount += prodResult.affectedRows;

          // Update buy_price in product_units level 1
          const [unitResult] = await conn.execute(
            `UPDATE product_units SET buy_price = ?, updated_at = NOW() WHERE product_id = ? AND level = 1`,
            [junePrice, ps.product_id]
          );
          unitsUpdatedCount += unitResult.affectedRows;
        }
      }
    }

    await conn.commit();
    console.log('\n=== UPDATE COMPLETED SUCCESSFULLY ===');
    console.log(`✅ Updated in product_suppliers : ${psUpdatedCount} rows`);
    console.log(`✅ Updated in products           : ${productsUpdatedCount} rows`);
    console.log(`✅ Updated in product_units      : ${unitsUpdatedCount} rows`);

  } catch (err) {
    await conn.rollback();
    console.error('❌ Error during update transaction. Rolled back.', err.message);
  } finally {
    // Show some samples post-update
    console.log('\n=== POST-UPDATE SAMPLE VERIFICATION ===');
    try {
      const [samples] = await conn.query(
        `SELECT p.id, p.product_name, p.product_price, ps.supplier_part_number, ps.purchase_price, ps.is_primary, pu.buy_price
         FROM product_suppliers ps
         JOIN products p ON ps.product_id = p.id
         JOIN product_units pu ON p.id = pu.product_id AND pu.level = 1
         WHERE ps.supplier_part_number LIKE 'EP%'
         LIMIT 5`
      );
      console.table(samples);
    } catch (e) {
      console.error('Sample verification query failed:', e.message);
    }
    
    await conn.end();
  }
}

run().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
