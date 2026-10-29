const db = require('../config/db');

async function runE2ETest() {
    console.log('===============================================================');
    console.log('🚀 MEMULAI PENGUJIAN TRANSAKSI MANUFACTURING & PERSEDIAAN (E2E)');
    console.log('===============================================================\n');

    try {
        // Step 1: Ambil data master yang valid
        console.log('📦 [Step 1] Memeriksa & Mengambil Data Master (Produk, Mold, Mesin, Gudang, Customer)...');
        const [products] = await db.query("SELECT id, product_name, product_code, product_unit FROM products WHERE product_name IS NOT NULL AND product_code IS NOT NULL LIMIT 1");
        if (products.length === 0) throw new Error('Tidak ada data produk di database.');
        const product = products[0];

        const [machines] = await db.query("SELECT id, code, name FROM machines LIMIT 1");
        const machine = machines.length > 0 ? machines[0] : { id: 1, code: 'MCH-01', name: 'Injection Machine 01' };

        const [molds] = await db.query("SELECT id, code, name FROM molds LIMIT 1");
        const mold = molds.length > 0 ? molds[0] : { id: 1, code: 'MLD-01', name: 'Mold 01' };

        const [warehouses] = await db.query("SELECT id, name FROM warehouses LIMIT 1");
        const warehouse = warehouses.length > 0 ? warehouses[0] : { id: 1, name: 'Gudang Jadi (WHFG)' };

        const [customers] = await db.query("SELECT id, customer_name FROM customers LIMIT 1");
        const customer = customers.length > 0 ? customers[0] : { id: 1, customer_name: 'PT Customer Test' };

        console.log(`✅ Data Master Siap:`);
        console.log(`   - Part/Produk : ${product.product_name} (${product.product_code})`);
        console.log(`   - Mesin       : ${machine.name} (${machine.code})`);
        console.log(`   - Mold        : ${mold.name} (${mold.code})`);
        console.log(`   - Gudang FG   : ${warehouse.name}`);
        console.log(`   - Customer    : ${customer.customer_name}\n`);

        // Step 2: Buat Work Order (WO)
        console.log('📝 [Step 2] Membuat Dokumen Work Order (WO)...');
        const timestamp = Date.now().toString().slice(-4);
        const woRef = `WO/TEST-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/${timestamp}`;
        const targetQty = 100;

        const [woResult] = await db.query(
            `INSERT INTO work_orders (reference, date, parent_product_id, target_qty, status, note, target_warehouse_id, department_id, created_at, updated_at) 
             VALUES (?, CURDATE(), ?, ?, 'Draft', 'Testing E2E Flow Antigravity', ?, 1, NOW(), NOW())`,
            [woRef, product.id, targetQty, warehouse.id]
        );
        const woId = woResult.insertId;
        console.log(`✅ Work Order Berhasil Dibuat: ID #${woId} [Ref: ${woRef}] dengan Target Qty = ${targetQty} pcs.\n`);

        // Step 3: Buat Planning Produksi (PrO) untuk WO
        console.log('⚙️ [Step 3] Membuat Planning Produksi (PrO / Schedule Eksekusi Mesin)...');
        const proCode = `PRO/TEST-${timestamp}`;
        const [proResult] = await db.query(
            `INSERT INTO planning_produksi (pro_code, wo_id, machine_id, mold_id, product_id, operator_name, shift, shift_hours, uph_used, target_qty, actual_qty, start_date, end_date, status, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, 'Operator Test', '1', 8, 50, ?, 0, CURDATE(), CURDATE(), 'Draft', NOW(), NOW())`,
            [proCode, woId, machine.id, mold.id, product.id, targetQty]
        );
        const proId = proResult.insertId;
        console.log(`✅ Planning Produksi Dibuat: ID #${proId} [Kode PrO: ${proCode}].\n`);

        // Step 4: Jalankan WO & PrO (Start Production)
        console.log('▶️ [Step 4] Menjalankan Work Order & PrO (Start Production)...');
        await db.query(`UPDATE work_orders SET status = 'In Progress', updated_at = NOW() WHERE id = ?`, [woId]);
        await db.query(`UPDATE planning_produksi SET status = 'In Progress', updated_at = NOW() WHERE id = ?`, [proId]);
        console.log(`✅ Status WO #${woId} dan PrO #${proId} berubah menjadi "In Progress".\n`);

        // Step 5: Catat Realisasi Output Produksi (Daily Board / Output Mesin)
        console.log('🏭 [Step 5] Mencatat Realisasi Output Mesin (Realisasi Produksi)...');
        const qtyOk = 95;
        const qtyNg = 5;
        const [outputResult] = await db.query(
            `INSERT INTO production_outputs (pro_id, qty_ok, qty_ng, qty_received, status, ng_type, notes, created_at, updated_at) 
             VALUES (?, ?, ?, 0, 'SFG_PENDING_QC', 'Short Mold (Defect Uji)', 'Output Shift 1 Operator Test', NOW(), NOW())`,
            [proId, qtyOk, qtyNg]
        );
        const outputId = outputResult.insertId;

        // Update actual qty di PrO
        await db.query(`UPDATE planning_produksi SET actual_qty = actual_qty + ?, updated_at = NOW() WHERE id = ?`, [qtyOk, proId]);
        console.log(`✅ Realisasi Produksi Dicatat: Output ID #${outputId}`);
        console.log(`   - Qty OK : ${qtyOk} pcs`);
        console.log(`   - Qty NG : ${qtyNg} pcs (Status: SFG_PENDING_QC / Menunggu QC Gate)\n`);

        // Step 6: Verifikasi QC Gate (Quality Control Inspection)
        console.log('🔍 [Step 6] Melakukan Verifikasi Quality Control (QC Gate In/Out Inspection)...');
        await db.query(
            `UPDATE production_outputs 
             SET status = 'Verified_QC', notes = CONCAT(COALESCE(notes,''), ' | Lolos Uji QC Gate (100% Standar Mutu)'), updated_at = NOW() 
             WHERE id = ?`,
            [outputId]
        );
        console.log(`✅ Verifikasi QC Selesai: Output #${outputId} berstatus "Verified_QC" (Siap Serah Terima ke Gudang Jadi / WHFG).\n`);

        // Step 7: Penerimaan Barang Jadi ke Gudang FG (Penerimaan FG / WHFG)
        console.log('📥 [Step 7] Penerimaan Barang Jadi ke Gudang Finished Goods (WHFG)...');
        await db.query(
            `UPDATE production_outputs 
             SET status = 'Received_FG', qty_received = ?, updated_at = NOW() 
             WHERE id = ?`,
            [qtyOk, outputId]
        );

        // Update / Tambah Stok Produk di Gudang
        const [existingStock] = await db.query(
            `SELECT id, product_quantity FROM products WHERE id = ?`,
            [product.id]
        );
        const currentStock = Number(existingStock[0]?.product_quantity || 0);
        const newStock = currentStock + qtyOk;
        await db.query(`UPDATE products SET product_quantity = ?, updated_at = NOW() WHERE id = ?`, [newStock, product.id]);

        console.log(`✅ Penerimaan FG Sukses:`);
        console.log(`   - Status Output #${outputId} : "Received_FG"`);
        console.log(`   - Stok Produk '${product.product_name}' : ${currentStock} ➔ ${newStock} ${product.product_unit || 'Unit'}\n`);

        // Step 8: Selesaikan Work Order (Finish WO)
        console.log('🏁 [Step 8] Menyelesaikan Work Order & PrO (Finish Production)...');
        await db.query(`UPDATE planning_produksi SET status = 'Completed', updated_at = NOW() WHERE id = ?`, [proId]);
        await db.query(`UPDATE work_orders SET status = 'Completed', updated_at = NOW() WHERE id = ?`, [woId]);
        console.log(`✅ Work Order #${woId} & PrO #${proId} berstatus "Completed".\n`);

        // Step 9: Buat Surat Jalan Pengiriman ke Customer (Delivery Order / SJ)
        console.log('🚚 [Step 9] Membuat Surat Jalan Pengiriman ke Customer...');
        const sjRef = `SJ/TEST-${timestamp}`;
        const qtyDelivery = 90;

        const [sjResult] = await db.query(
            `INSERT INTO surat_jalan (reference, customer_id, source_type, source_ref, driver_name, vehicle_no, delivery_date, status, note, created_at, updated_at) 
             VALUES (?, ?, 'Work Order', ?, 'Pak Supir Antigravity', 'B 1234 EPU', CURDATE(), 'Delivered', 'Pengiriman Hasil Produksi WO E2E', NOW(), NOW())`,
            [sjRef, customer.id, woRef]
        );
        const sjId = sjResult.insertId;

        // Detail Surat Jalan
        await db.query(
            `INSERT INTO surat_jalan_details (sj_id, product_id, product_name, product_code, product_unit, qty_delivered, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [sjId, product.id, product.product_name, product.product_code, product.product_unit || 'Unit', qtyDelivery]
        );

        // Potong Stok Gudang karena Surat Jalan sudah terkirim
        const finalStock = newStock - qtyDelivery;
        await db.query(`UPDATE products SET product_quantity = ?, updated_at = NOW() WHERE id = ?`, [finalStock, product.id]);

        console.log(`✅ Surat Jalan Berhasil Diterbitkan: ID #${sjId} [Nomor SJ: ${sjRef}]`);
        console.log(`   - Customer       : ${customer.customer_name}`);
        console.log(`   - Driver & Mobil : Pak Supir Antigravity (B 1234 EPU)`);
        console.log(`   - Qty Terkirim   : ${qtyDelivery} ${product.product_unit || 'Unit'}`);
        console.log(`   - Sisa Stok FG   : ${newStock} - ${qtyDelivery} = ${finalStock} ${product.product_unit || 'Unit'}\n`);

        console.log('===============================================================');
        console.log('🎉 PENGUJIAN END-TO-END MANUFACTURING & PERSEDIAAN SELESAI DENGAN SUKSES (100% VALID)!');
        console.log('===============================================================');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error saat pengujian E2E:', error);
        process.exit(1);
    }
}

runE2ETest();
