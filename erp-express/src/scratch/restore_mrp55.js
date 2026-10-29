const mysql = require('mysql2/promise');

async function restoreMRP55Details() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        console.log('--- 1. Restoring details for MRP #55 ---');
        const [mrpRows] = await connection.execute('SELECT * FROM mrps WHERE id = 55');
        const mrp = mrpRows[0];
        const poId = mrp.po_customer_id || 6;
        await connection.execute('UPDATE mrps SET po_customer_id = 6 WHERE id = 55');

        // Get PO Items
        const [poItems] = await connection.execute(
            'SELECT product_id, product_code, po_qty FROM customer_po_details WHERE po_id = ?',
            [poId]
        );
        console.log(`Found ${poItems.length} PO items:`, poItems);

        // Fetch BOMs for these items
        const requirementsMap = {};
        for (const item of poItems) {
            const [bomRows] = await connection.execute(
                "SELECT id, bom_code, finished_good_qty FROM boms WHERE finished_good_code = ? AND status = 'Aktif' LIMIT 1",
                [item.product_code]
            );
            if (bomRows.length > 0) {
                const bom = bomRows[0];
                const fgQty = Number(bom.finished_good_qty) || 1;
                const bomRefStr = bom.bom_code || `BOM-${item.product_code}`;

                const [bomItems] = await connection.execute(
                    "SELECT product_code, qty, item_type FROM bom_items WHERE bom_id = ?",
                    [bom.id]
                );
                for (const bi of bomItems) {
                    const [pRows] = await connection.execute(
                        `SELECT p.id, p.product_name, p.product_code, p.product_unit, p.product_price, p.min_qty, p.supplier_id,
                                cat.category_name
                         FROM products p
                         LEFT JOIN categories cat ON p.category_id = cat.id
                         WHERE p.product_code = ? LIMIT 1`,
                        [bi.product_code]
                    );
                    if (pRows.length > 0) {
                        const rawProd = pRows[0];
                        const baseGross = (Number(item.po_qty) / fgQty) * Number(bi.qty);

                        let classType = 'Component';
                        const catLower = (rawProd.category_name || '').toLowerCase();
                        if (catLower.includes('raw') || bi.item_type === 'RAW') classType = 'Raw Material';
                        else if (catLower.includes('pack') || catLower.includes('box')) classType = 'Packaging';
                        else if (catLower.includes('consumable')) classType = 'Consumable';

                        if (!requirementsMap[rawProd.id]) {
                            requirementsMap[rawProd.id] = {
                                productId: rawProd.id,
                                productCode: rawProd.product_code,
                                productName: rawProd.product_name,
                                productUnit: rawProd.product_unit || 'PCS',
                                classType,
                                sourceType: 'Buy',
                                grossQty: 0,
                                unitPrice: Number(rawProd.product_price) || 0,
                                minQty: Number(rawProd.min_qty) || 0,
                                supplierId: rawProd.supplier_id || null,
                                bomRef: bomRefStr
                            };
                        }
                        requirementsMap[rawProd.id].grossQty += baseGross;
                    }
                }
            }
        }

        let totalGross = 0, totalNet = 0, totalCost = 0;

        for (const [productId, req] of Object.entries(requirementsMap)) {
            const safetyQty = Math.ceil(req.grossQty * 0.05 + req.minQty);
            const netQty = req.grossQty; // or after stock

            const [psRows] = await connection.execute(
                `SELECT ps.supplier_id, ps.purchase_price, ps.allocation_percent, ps.pcs_per_pack, s.supplier_name
                 FROM product_suppliers ps
                 JOIN suppliers s ON ps.supplier_id = s.id
                 WHERE ps.product_id = ?`,
                [productId]
            );

            if (psRows.length > 1) {
                for (const ps of psRows) {
                    const normPct = Number(ps.allocation_percent) || Math.round(100 / psRows.length);
                    const splitOrd = Math.round((netQty * normPct) / 100);
                    const pPack = Number(ps.pcs_per_pack) || 1;
                    const splitMrp = pPack <= 1 ? splitOrd : Math.ceil(splitOrd / pPack) * pPack;
                    const price = Number(ps.purchase_price) || req.unitPrice;
                    const subtotal = splitMrp * price;

                    totalGross += splitOrd;
                    totalNet += splitMrp;
                    totalCost += subtotal;

                    await connection.execute(`
                        INSERT INTO mrp_details (
                            mrp_id, product_id, class_type, source_type, need_all_qty, stock_std_qty, sto_qty,
                            gross_qty, safety_stock_qty, current_stock, on_order_qty, qty_required, net_qty,
                            unit_price, subtotal_cost, bom_ref, supplier_id, part_no_vendor, part_name_vendor,
                            ord_qty, mrp_qty, amount, allocation_percent, remark, qty_released_pr, created_at, updated_at
                        ) VALUES (55, ?, ?, 'Buy', ?, ?, 0, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, NOW(), NOW())
                    `, [
                        productId, req.classType, req.grossQty, safetyQty, req.grossQty, safetyQty, splitMrp, splitMrp,
                        price, subtotal, req.bomRef, ps.supplier_id, req.productCode, `${req.productName} (${ps.supplier_name})`,
                        splitOrd, splitMrp, subtotal, normPct
                    ]);
                }
            } else {
                const ps = psRows.length === 1 ? psRows[0] : null;
                const pPack = ps ? (Number(ps.pcs_per_pack) || 1) : 1;
                const mrpQty = pPack <= 1 ? netQty : Math.ceil(netQty / pPack) * pPack;
                const price = ps ? (Number(ps.purchase_price) || req.unitPrice) : req.unitPrice;
                const subtotal = mrpQty * price;

                totalGross += netQty;
                totalNet += mrpQty;
                totalCost += subtotal;

                await connection.execute(`
                    INSERT INTO mrp_details (
                        mrp_id, product_id, class_type, source_type, need_all_qty, stock_std_qty, sto_qty,
                        gross_qty, safety_stock_qty, current_stock, on_order_qty, qty_required, net_qty,
                        unit_price, subtotal_cost, bom_ref, supplier_id, part_no_vendor, part_name_vendor,
                        ord_qty, mrp_qty, amount, allocation_percent, remark, qty_released_pr, created_at, updated_at
                    ) VALUES (55, ?, ?, 'Buy', ?, ?, 0, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 100, NULL, 0, NOW(), NOW())
                `, [
                    productId, req.classType, req.grossQty, safetyQty, req.grossQty, safetyQty, mrpQty, mrpQty,
                    price, subtotal, req.bomRef, ps ? ps.supplier_id : req.supplierId, req.productCode, req.productName,
                    netQty, mrpQty, subtotal
                ]);
            }
        }

        await connection.execute(
            'UPDATE mrps SET total_gross_qty = ?, total_net_qty = ?, total_est_cost = ?, status = ? WHERE id = 55',
            [totalGross, totalNet, totalCost, 'Approved']
        );

        await connection.commit();
        console.log(`✅ Successfully restored MRP #55 details! Total Net: ${totalNet}, Total Cost: Rp ${totalCost}`);

        const [cnt] = await pool.execute('SELECT COUNT(*) as cnt FROM mrp_details WHERE mrp_id = 55');
        console.log(`New detail count: ${cnt[0].cnt}`);

    } catch (e) {
        await connection.rollback();
        console.error('Error:', e);
    } finally {
        connection.release();
        await pool.end();
    }
}

restoreMRP55Details();
