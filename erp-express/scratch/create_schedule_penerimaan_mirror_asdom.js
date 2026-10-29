const db = require('../src/config/db');

async function generateScheduleGRReference(connection) {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `BPB/SCH-EPU/${year}/${month}/`;
    const globalPrefix = `BPB/SCH-EPU/${year}/%`;

    const [latest] = await connection.execute(
        'SELECT reference FROM goods_receipts WHERE reference LIKE ? ORDER BY id DESC LIMIT 1',
        [globalPrefix]
    );

    let sequence = 1;
    if (latest.length > 0) {
        const lastRef = latest[0].reference;
        const parts = lastRef.split('/');
        const lastSeqStr = parts[parts.length - 1];
        if (lastSeqStr && lastSeqStr.length === 4 && !isNaN(parseInt(lastSeqStr))) {
            sequence = parseInt(lastSeqStr) + 1;
        }
    }
    return `${prefix}${String(sequence).padStart(4, '0')}`;
}

async function createSchedulePenerimaan() {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        console.log('=== MEMBUAT SCHEDULE PENERIMAAN BARANG DARI BOM MIRROR, BACK (SET) FED (ASDOM) (1000 PCS) ===');

        // Target Finished Good
        const fgCode = 'EPAS-FASIFHND';
        const fgName = 'MIRROR, BACK (SET) FED (ASDOM)';
        const targetProductionQty = 1000;

        // Fetch BOM Items for BOM 122
        const [bomItems] = await connection.query(`
            SELECT bi.*, p.id as product_id, p.product_name, p.product_unit, p.product_price, p.supplier_id, s.supplier_name, s.supplier_code
            FROM bom_items bi
            JOIN boms b ON bi.bom_id = b.id
            LEFT JOIN products p ON bi.product_code = p.product_code
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            WHERE b.id = 122 OR b.finished_good_code = ?
        `, [fgCode]);

        if (bomItems.length === 0) {
            throw new Error(`BOM untuk ${fgCode} (${fgName}) tidak ditemukan.`);
        }

        console.log(`Ditemukan ${bomItems.length} item komponen dari BOM.`);

        // Group items by Supplier
        const supplierGroups = {};
        for (const item of bomItems) {
            const supId = item.supplier_id || 49; // default fallback if null
            const supName = item.supplier_name || 'Vendor Terdaftar';
            if (!supplierGroups[supId]) {
                supplierGroups[supId] = {
                    supplierId: supId,
                    supplierName: supName,
                    supplierCode: item.supplier_code || '',
                    items: []
                };
            }
            const requiredQty = Number(item.qty) * (targetProductionQty / 1);
            supplierGroups[supId].items.push({
                productId: item.product_id,
                productCode: item.product_code,
                productName: item.product_name || item.product_code,
                productUnit: item.product_unit || 'PCS',
                unitPrice: Number(item.product_price || 0),
                qtyRequired: requiredQty
            });
        }

        const today = new Date();
        const scheduleDateStr = today.toISOString().split('T')[0];

        const createdReceipts = [];

        for (const [supId, group] of Object.entries(supplierGroups)) {
            const refCode = await generateScheduleGRReference(connection);
            const bpbNumber = `SCH-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`;

            console.log(`\nMembuat Schedule Penerimaan untuk [${group.supplierName}] -> Ref: ${refCode}`);

            const [grRes] = await connection.query(`
                INSERT INTO goods_receipts (
                    reference, bpb_number, date, supplier_id, status, note, users_id, created_at, updated_at
                ) VALUES (?, ?, ?, ?, 'Pending', ?, 1, NOW(), NOW())
            `, [
                refCode,
                bpbNumber,
                scheduleDateStr,
                group.supplierId,
                `Schedule Penerimaan Material untuk Produksi 1.000 Pcs ${fgName}`
            ]);

            const grId = grRes.insertId;

            for (const it of group.items) {
                await connection.query(`
                    INSERT INTO goods_receipt_details (
                        gr_id, product_id, product_name, product_code, qty_ordered, qty_received,
                        product_unit, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                `, [
                    grId,
                    it.productId,
                    it.productName,
                    it.productCode,
                    it.qtyRequired,
                    it.qtyRequired,
                    it.productUnit
                ]);

                // Also populate vendor_daily_schedules for grid visualization
                await connection.query(`
                    INSERT INTO vendor_daily_schedules (
                        supplier_id, product_id, po_qty_1, po_qty_2, schedule_date, schedule_qty, manual_actual_qty, notes, created_at, updated_at
                    ) VALUES (?, ?, ?, 0, ?, ?, NULL, ?, NOW(), NOW())
                    ON DUPLICATE KEY UPDATE schedule_qty = VALUES(schedule_qty), updated_at = NOW()
                `, [
                    group.supplierId,
                    it.productId,
                    it.qtyRequired,
                    scheduleDateStr,
                    it.qtyRequired,
                    `Produksi 1000 Pcs ${fgName}`
                ]);

                console.log(`  - [${it.productCode}] ${it.productName}: ${it.qtyRequired} ${it.productUnit}`);
            }

            createdReceipts.push({
                reference: refCode,
                supplierName: group.supplierName,
                itemCount: group.items.length
            });
        }

        await connection.commit();
        console.log('\n======================================================');
        console.log('BERHASIL MEMBUAT SCHEDULE PENERIMAAN BARANG!');
        console.table(createdReceipts);
        process.exit(0);
    } catch (err) {
        await connection.rollback();
        console.error('Gagal membuat schedule penerimaan:', err);
        process.exit(1);
    } finally {
        connection.release();
    }
}

createSchedulePenerimaan();
