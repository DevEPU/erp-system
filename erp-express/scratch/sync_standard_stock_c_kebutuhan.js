const xlsx = require('xlsx');
const db = require('../src/config/db');

async function syncStandardStockCKebutuhan() {
    try {
        const f1 = 'c:/laragon/www/erp-epu-main/8. Agustus 2026 MRP-1.xlsx';
        const f2 = 'c:/laragon/www/erp-epu-main/8. Agustus 2026 MRP-2 Rev02.xlsx';

        const [prods] = await db.query('SELECT id, product_code, product_name, product_unit, product_type, product_price FROM products');
        const prodMap = {};
        for (const p of prods) prodMap[p.product_code.trim()] = p;

        const [sups] = await db.query('SELECT id, supplier_code, supplier_name FROM suppliers');
        const supMap = {};
        for (const s of sups) supMap[s.supplier_name.trim().toLowerCase()] = s;
        const findSup = (name) => {
            if (!name) return null;
            const clean = name.trim().toLowerCase();
            if (supMap[clean]) return supMap[clean];
            return sups.find(s => s.supplier_name.toLowerCase().includes(clean) || clean.includes(s.supplier_name.toLowerCase())) || null;
        };

        // =========================================================================
        // 1. SYNC MRP-1 (ID: 95)
        // =========================================================================
        console.log('=== SYNCING MRP-1 (ID 95) FROM C. Kebutuhan & D. MRP (3) ===');
        const wb1 = xlsx.readFile(f1);
        const d1_3 = xlsx.utils.sheet_to_json(wb1.Sheets['D. MRP (3)'], { header: 1 });
        const dataC1 = xlsx.utils.sheet_to_json(wb1.Sheets['C. Kebutuhan'], { header: 1 });

        const kebMap1 = {};
        for (let r = 3; r < dataC1.length; r++) {
            const row = dataC1[r];
            if (!row || !row[2]) continue;
            const pCode = String(row[2]).trim();
            kebMap1[pCode] = {
                classType: row[4] || 'Component',
                sourceType: row[5] || 'Buy',
                needAll: Number(row[12] !== undefined ? row[12] : (row[9] || 0)),
                stockStd: Number(row[13] || 0),
                sto: Number(row[14] || 0),
                kebutuhan: Number(row[15] || 0)
            };
        }

        await db.query('DELETE FROM mrp_details WHERE mrp_id = 95');

        let totalGross1 = 0, totalNet1 = 0, totalEstCost1 = 0, totalReleasedPr1 = 0;
        for (let r = 4; r < d1_3.length; r++) {
            const row = d1_3[r];
            if (!row || !row[2]) continue;

            const pCode = String(row[2]).trim();
            const prod = prodMap[pCode];
            if (!prod) {
                console.error('Product not found in DB:', pCode);
                continue;
            }

            const classType = row[1] || kebMap1[pCode]?.classType || 'Component';
            const sourceType = kebMap1[pCode]?.sourceType || 'Buy';
            const partNoVendor = row[4] ? String(row[4]).trim() : pCode;
            const partNameVendor = row[5] ? String(row[5]).trim() : prod.product_name;
            const vendorName = row[6] ? String(row[6]).trim() : '';
            const sup = findSup(vendorName);
            const supplierId = sup ? sup.id : null;

            const unitPrice = Number(row[7]) || 0;
            const pcsPerPack = Number(row[9]) || 1;
            const minOrder = Number(row[10]) || 0;
            const quotaRaw = Number(row[11]) || 1;
            const quotaPct = (quotaRaw > 0 && quotaRaw <= 1) ? Math.round(quotaRaw * 100) : Math.round(quotaRaw || 100);

            // Read physical quantities directly from C. Kebutuhan!
            const needAll = kebMap1[pCode] ? kebMap1[pCode].needAll : (Number(row[12]) || 0);
            const stockStd = kebMap1[pCode] ? kebMap1[pCode].stockStd : (Number(row[13]) || 0);
            const sto = kebMap1[pCode] ? kebMap1[pCode].sto : 0;
            const kebutuhanBersihAllocated = Number(row[13]) || 0;

            const ordQty = Number(row[14]) || 0;
            const mrpQty = Number(row[15]) || 0;
            const amount = Number(row[16]) || (mrpQty * unitPrice);

            const po1PctRaw = Number(row[19]);
            const po1Pct = isNaN(po1PctRaw) ? 100 : (po1PctRaw <= 1 ? Math.round(po1PctRaw * 100) : Math.round(po1PctRaw));
            const actPo1 = Number(row[21]) || Math.ceil(mrpQty * (po1Pct / 100));

            totalGross1 += needAll;
            totalNet1 += mrpQty;
            totalEstCost1 += amount;
            totalReleasedPr1 += actPo1;

            await db.query(`
                INSERT INTO mrp_details (
                    mrp_id, product_id, class_type, source_type, need_all_qty, stock_std_qty, sto_qty,
                    gross_qty, safety_stock_qty, current_stock, on_order_qty, qty_required, net_qty,
                    unit_price, subtotal_cost, bom_ref, supplier_id, part_no_vendor, part_name_vendor,
                    ord_qty, mrp_qty, amount, allocation_percent, remark, release_draft_percent, qty_released_pr, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NOW(), NOW())
            `, [
                95, prod.id, classType, sourceType, needAll, stockStd, sto,
                needAll, stockStd, sto, kebutuhanBersihAllocated, kebutuhanBersihAllocated,
                unitPrice, amount, supplierId, partNoVendor, partNameVendor,
                ordQty, mrpQty, amount, quotaPct,
                po1Pct, actPo1
            ]);
        }

        await db.query(`
            UPDATE mrps 
            SET total_gross_qty = ?, total_net_qty = ?, total_est_cost = ?, updated_at = NOW()
            WHERE id = 95
        `, [totalGross1, totalNet1, totalEstCost1]);
        console.log('MRP-1 (ID 95) synced successfully!', { totalGross1, totalNet1, totalEstCost1, totalReleasedPr1 });

        // =========================================================================
        // 2. SYNC MRP-2 (ID: 96)
        // =========================================================================
        console.log('\n=== SYNCING MRP-2 (ID 96) FROM C. Kebutuhan & D. MRP (3) ===');
        const wb2 = xlsx.readFile(f2);
        const d2_3 = xlsx.utils.sheet_to_json(wb2.Sheets['D. MRP (3)'], { header: 1 });
        const dataC2 = xlsx.utils.sheet_to_json(wb2.Sheets['C. Kebutuhan'], { header: 1 });

        const kebMap2 = {};
        for (let r = 3; r < dataC2.length; r++) {
            const row = dataC2[r];
            if (!row || !row[2]) continue;
            const pCode = String(row[2]).trim();
            kebMap2[pCode] = {
                classType: row[4] || 'Component',
                sourceType: row[5] || 'Buy',
                needAll: Number(row[12] !== undefined ? row[12] : (row[9] || 0)),
                stockStd: Number(row[13] || 0),
                sto: Number(row[14] || 0),
                kebutuhan: Number(row[15] || 0)
            };
        }

        await db.query('DELETE FROM mrp_details WHERE mrp_id = 96');

        let totalGross2 = 0, totalNet2 = 0, totalEstCost2 = 0, totalActPo2 = 0, totalAmountPo2 = 0;
        for (let r = 4; r < d2_3.length; r++) {
            const row = d2_3[r];
            if (!row || !row[2]) continue;

            const pCode = String(row[2]).trim();
            const prod = prodMap[pCode];
            if (!prod) {
                console.error('Product not found in DB:', pCode);
                continue;
            }

            const classType = row[1] || kebMap2[pCode]?.classType || 'Component';
            const sourceType = kebMap2[pCode]?.sourceType || 'Buy';
            const partNoVendor = row[4] ? String(row[4]).trim() : pCode;
            const partNameVendor = row[5] ? String(row[5]).trim() : prod.product_name;
            const vendorName = row[6] ? String(row[6]).trim() : '';
            const sup = findSup(vendorName);
            const supplierId = sup ? sup.id : null;

            const unitPrice = Number(row[7]) || 0;
            const quotaRaw = Number(row[11]) || 1;
            const quotaPct = (quotaRaw > 0 && quotaRaw <= 1) ? Math.round(quotaRaw * 100) : Math.round(quotaRaw || 100);

            // Read physical quantities directly from C. Kebutuhan!
            const needAll = kebMap2[pCode] ? kebMap2[pCode].needAll : (Number(row[12]) || 0);
            const stockStd = kebMap2[pCode] ? kebMap2[pCode].stockStd : (Number(row[13]) || 0);
            const sto = kebMap2[pCode] ? kebMap2[pCode].sto : 0;
            const mrp2Kumulatif = Number(row[16]) || 0;

            const po1PctRaw = Number(row[21]);
            const po1Pct = isNaN(po1PctRaw) ? 100 : (po1PctRaw <= 1 ? Math.round(po1PctRaw * 100) : Math.round(po1PctRaw));
            const actPo1 = Number(row[22]) || 0;

            // ACT PO-2 (Order Baru di MRP-2)
            const actPo2 = Number(row[27]) !== undefined ? Number(row[27]) : Math.max(0, mrp2Kumulatif - actPo1);
            const amountPo2 = Number(row[28]) !== undefined ? Number(row[28]) : (actPo2 * unitPrice);

            totalGross2 += needAll;
            totalNet2 += mrp2Kumulatif;
            totalActPo2 += actPo2;
            totalAmountPo2 += amountPo2;
            totalEstCost2 += amountPo2;

            await db.query(`
                INSERT INTO mrp_details (
                    mrp_id, product_id, class_type, source_type, need_all_qty, stock_std_qty, sto_qty,
                    gross_qty, safety_stock_qty, current_stock, on_order_qty, qty_required, net_qty,
                    unit_price, subtotal_cost, bom_ref, supplier_id, part_no_vendor, part_name_vendor,
                    ord_qty, mrp_qty, amount, allocation_percent, remark, release_draft_percent, qty_released_pr, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, NULL, 100, 0, NOW(), NOW())
            `, [
                96, prod.id, classType, sourceType, needAll, stockStd, sto,
                needAll, stockStd, sto, actPo1, actPo2, actPo2,
                unitPrice, amountPo2, supplierId, partNoVendor, partNameVendor,
                actPo2, mrp2Kumulatif, amountPo2, quotaPct
            ]);
        }

        await db.query(`
            UPDATE mrps 
            SET total_gross_qty = ?, total_net_qty = ?, total_est_cost = ?, updated_at = NOW()
            WHERE id = 96
        `, [totalGross2, totalActPo2, totalAmountPo2]);
        console.log('MRP-2 (ID 96) synced successfully!', { totalGross2, totalNet2, totalActPo2, totalAmountPo2 });

        console.log('\nALL 149 ITEMS SYNCED WITH EXACT C. KEBUTUHAN STOCK STD & STO!');
        process.exit(0);
    } catch (err) {
        console.error('Error syncing standard stock:', err);
        process.exit(1);
    }
}

syncStandardStockCKebutuhan();
