const db = require('../config/db');

async function runMigrations() {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Create ng_disposals table
    console.log('Creating ng_disposals table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ng_disposals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        reference_no VARCHAR(100) NOT NULL,
        disposal_type ENUM('WIP_Crusher', 'WIP_Disposal', 'Component_Disposal', 'Material_Disposal') NOT NULL,
        source_type ENUM('Production', 'Customer_Claim', 'QC_Gate') NOT NULL,
        source_id INT DEFAULT NULL COMMENT 'ID dari production_output / customer_claim / internal_transfer',
        work_order_id INT DEFAULT NULL COMMENT 'Link ke WO asal',
        product_id BIGINT UNSIGNED NOT NULL,
        qty INT NOT NULL,
        reason TEXT,
        action_taken ENUM('Sent_To_Crusher', 'Disposed', 'Returned_To_Vendor', 'Rework', 'Released_OK') NOT NULL,
        processed_by VARCHAR(100),
        processed_date DATE,
        crusher_transfer_id INT DEFAULT NULL COMMENT 'Link ke internal_transfers jika dikirim ke crusher',
        regrind_product_id BIGINT UNSIGNED DEFAULT NULL COMMENT 'Produk regrind hasil crusher',
        status ENUM('Pending', 'In_Progress', 'Completed') DEFAULT 'Pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ ng_disposals table created.');

    // 2. Create claim_investigation_items table
    console.log('Creating claim_investigation_items table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS claim_investigation_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_claim_id BIGINT UNSIGNED NOT NULL,
        product_id BIGINT UNSIGNED NOT NULL,
        item_type ENUM('WIP', 'Component', 'Raw_Material') NOT NULL,
        qty_inspected INT NOT NULL DEFAULT 0,
        qty_ok INT NOT NULL DEFAULT 0,
        qty_ng INT NOT NULL DEFAULT 0,
        ng_action ENUM('Crusher', 'Disposal', 'Rework', 'Return_To_Stock', 'Vendor_Claim') DEFAULT NULL,
        destination_warehouse_id INT DEFAULT NULL,
        disposal_id INT DEFAULT NULL COMMENT 'Link ke ng_disposals jika di-disposal/crusher',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_claim_id) REFERENCES customer_claims(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ claim_investigation_items table created.');

    // 3. ALTER customer_claims - add tracking columns
    console.log('Altering customer_claims table...');
    const [claimCols] = await connection.query('DESCRIBE customer_claims');
    const claimColNames = claimCols.map(c => c.Field);

    if (!claimColNames.includes('surat_jalan_id')) {
      await connection.query(`ALTER TABLE customer_claims ADD COLUMN surat_jalan_id BIGINT UNSIGNED DEFAULT NULL COMMENT 'Link ke SJ pengiriman asal'`);
      console.log('  + Added surat_jalan_id');
    }
    if (!claimColNames.includes('qty_ok')) {
      await connection.query(`ALTER TABLE customer_claims ADD COLUMN qty_ok INT DEFAULT 0 COMMENT 'Qty setelah sortir yg OK'`);
      console.log('  + Added qty_ok');
    }
    if (!claimColNames.includes('qty_ng')) {
      await connection.query(`ALTER TABLE customer_claims ADD COLUMN qty_ng INT DEFAULT 0 COMMENT 'Qty setelah sortir yg NG'`);
      console.log('  + Added qty_ng');
    }
    if (!claimColNames.includes('investigation_status')) {
      await connection.query(`ALTER TABLE customer_claims ADD COLUMN investigation_status ENUM('Pending', 'In_Progress', 'Completed') DEFAULT 'Pending'`);
      console.log('  + Added investigation_status');
    }
    if (!claimColNames.includes('investigated_by')) {
      await connection.query(`ALTER TABLE customer_claims ADD COLUMN investigated_by VARCHAR(100) DEFAULT NULL`);
      console.log('  + Added investigated_by');
    }
    console.log('✅ customer_claims altered.');

    // 4. ALTER crusher_logs - add WO & disposal links
    console.log('Altering crusher_logs table...');
    const [crusherCols] = await connection.query('DESCRIBE crusher_logs');
    const crusherColNames = crusherCols.map(c => c.Field);

    if (!crusherColNames.includes('work_order_id')) {
      await connection.query(`ALTER TABLE crusher_logs ADD COLUMN work_order_id INT DEFAULT NULL COMMENT 'Link ke WO asal'`);
      console.log('  + Added work_order_id');
    }
    if (!crusherColNames.includes('disposal_id')) {
      await connection.query(`ALTER TABLE crusher_logs ADD COLUMN disposal_id INT DEFAULT NULL COMMENT 'Link ke ng_disposals'`);
      console.log('  + Added disposal_id');
    }
    if (!crusherColNames.includes('source_type')) {
      await connection.query(`ALTER TABLE crusher_logs ADD COLUMN source_type ENUM('Production_NG', 'Customer_Claim', 'Runner_Sprue') DEFAULT 'Runner_Sprue'`);
      console.log('  + Added source_type');
    }
    if (!crusherColNames.includes('regrind_product_id')) {
      await connection.query(`ALTER TABLE crusher_logs ADD COLUMN regrind_product_id BIGINT UNSIGNED DEFAULT NULL COMMENT 'Produk regrind yang dihasilkan'`);
      console.log('  + Added regrind_product_id');
    }
    console.log('✅ crusher_logs altered.');

    // 5. ALTER warehouse_stocks - add stock_condition
    console.log('Altering warehouse_stocks table...');
    const [wsCols] = await connection.query('DESCRIBE warehouse_stocks');
    const wsColNames = wsCols.map(c => c.Field);

    if (!wsColNames.includes('stock_condition')) {
      await connection.query(`ALTER TABLE warehouse_stocks ADD COLUMN stock_condition ENUM('OK', 'NG', 'Hold', 'Quarantine') DEFAULT 'OK' COMMENT 'Kondisi stok'`);
      console.log('  + Added stock_condition');
    }
    console.log('✅ warehouse_stocks altered.');

    await connection.commit();
    console.log('\n🎉 All migrations completed successfully!');
  } catch (err) {
    await connection.rollback();
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    connection.release();
    process.exit(0);
  }
}

runMigrations();
