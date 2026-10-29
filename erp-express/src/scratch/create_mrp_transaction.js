const db = require('../config/db');

async function createMRPTransaction() {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        console.log("=== CREATING MRP TRANSACTION FOR PO CPO/26/08/0001 ===");

        // 1. Get PO details for CPO/26/08/0001
        const [poRows] = await connection.execute(
            "SELECT * FROM customer_po WHERE reference = 'CPO/26/08/0001' OR no_po_customer = 'CPO/26/08/0001'"
        );

        if (poRows.length === 0) {
            console.error("PO CPO/26/08/0001 not found!");
            process.exit(1);
        }

        const po = poRows[0];
        console.log("Target Customer PO found:", po.reference, "(ID:", po.id, ")");

        const [poDetails] = await connection.execute(
            "SELECT * FROM customer_po_details WHERE po_id = ?",
            [po.id]
        );
        console.log("Target PO Details count:", poDetails.length);

        // Clean up previous test draft MRP runs for PO CPO/26/08/0001 if any
        const [oldMrps] = await connection.execute("SELECT id FROM mrps WHERE po_customer_id = ?", [po.id]);
        if (oldMrps.length > 0) {
            const oldIds = oldMrps.map(m => m.id);
            await connection.execute(`DELETE FROM mrp_details WHERE mrp_id IN (${oldIds.join(',')})`);
            await connection.execute(`DELETE FROM mrps WHERE id IN (${oldIds.join(',')})`);
        }

        // 2. Generate MRP Reference
        const yearStr = new Date().getFullYear().toString().slice(-2);
        const monthStr = String(new Date().getMonth() + 1).padStart(2, '0');
        const prefix = `MRP/EPU/${yearStr}/${monthStr}/`;

        const [latestMrp] = await connection.execute(
            "SELECT reference_code FROM mrps WHERE reference_code LIKE ? ORDER BY id DESC LIMIT 1",
            [`MRP/EPU/${yearStr}/%`]
        );

        let seq = 1;
        if (latestMrp.length > 0) {
            const parts = latestMrp[0].reference_code.split('/');
            const lastSeq = parseInt(parts[parts.length - 1]);
            if (!isNaN(lastSeq)) seq = lastSeq + 1;
        }
        const mrpRef = `${prefix}${String(seq).padStart(4, '0')}`;
        console.log("Generated MRP Reference Code:", mrpRef);

        // 3. Insert into `mrps` table
        const startDate = po.tanggal_po ? new Date(po.tanggal_po).toISOString().split('T')[0] : '2026-08-10';
        const endDate = po.delivery_date ? new Date(po.delivery_date).toISOString().split('T')[0] : '2026-08-31';

        const [mrpResult] = await connection.execute(
            `INSERT INTO mrps (
                reference_code, planning_source, po_customer_id, forecast_id, warehouse_id, planner_name,
                safety_stock_percent, scrap_loss_percent, time_frame_start, time_frame_end,
                total_gross_qty, total_net_qty, total_est_cost, note, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                mrpRef,
                'PO Customer',
                po.id,
                poDetails[0]?.forecast_detail_id || null,
                3, // Warehouse ID
                'PPIC Planner',
                0,
                0,
                startDate,
                endDate,
                0, // Will update
                0, // Will update
                0, // Will update
                `MRP Transaction for Customer PO ${po.reference} (PO Customer No: ${po.no_po_customer || '23121'})`,
                'Released'
            ]
        );

        const mrpId = mrpResult.insertId;
        console.log("MRP Record created with ID:", mrpId);

        // 4. Explode BOM items for PO Customer Details
        let totalGrossSum = 0;
        let totalNetSum = 0;
        let totalCostSum = 0;

        for (const detail of poDetails) {
            const fgCode = detail.product_code;
            const poQty = Number(detail.po_qty || 0);

            console.log(`Processing FG ${fgCode} with PO Qty: ${poQty}...`);

            const [bomRows] = await connection.execute(
                "SELECT id, bom_code FROM boms WHERE finished_good_code = ? LIMIT 1",
                [fgCode]
            );

            if (bomRows.length > 0) {
                const bom = bomRows[0];
                const [bomItems] = await connection.execute(
                    "SELECT * FROM bom_items WHERE bom_id = ?",
                    [bom.id]
                );

                for (const item of bomItems) {
                    const [prodRows] = await connection.execute(
                        "SELECT id, product_name, product_code, product_unit, product_quantity, min_qty, product_price, supplier_id FROM products WHERE product_code = ? LIMIT 1",
                        [item.product_code]
                    );

                    if (prodRows.length > 0) {
                        const rawProd = prodRows[0];
                        const qtyPerFG = Number(item.qty || 0);
                        const grossQty = qtyPerFG * poQty;
                        const currentStock = Number(rawProd.product_quantity || 0);
                        const safetyStock = Number(rawProd.min_qty || 0);
                        const netQty = Math.max(0, grossQty + safetyStock - currentStock);
                        const unitPrice = Number(item.price || rawProd.product_price || 0);
                        const estAmount = netQty * unitPrice;

                        totalGrossSum += grossQty;
                        totalNetSum += netQty;
                        totalCostSum += estAmount;

                        await connection.execute(
                            `INSERT INTO mrp_details (
                                mrp_id, product_id, class_type, source_type, need_all_qty,
                                stock_std_qty, sto_qty, gross_qty, safety_stock_qty, current_stock,
                                on_order_qty, qty_required, net_qty, unit_price, subtotal_cost,
                                bom_ref, remark, supplier_id, part_no_vendor, part_name_vendor,
                                allocation_percent, ord_qty, mrp_qty, amount, created_at, updated_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                            [
                                mrpId,
                                rawProd.id,
                                item.item_type || 'RAW',
                                'Purchased',
                                grossQty,
                                currentStock,
                                0,
                                grossQty,
                                safetyStock,
                                currentStock,
                                0,
                                grossQty,
                                netQty,
                                unitPrice,
                                estAmount,
                                bom.bom_code,
                                `BOM explosion for PO ${po.reference} (${fgCode})`,
                                rawProd.supplier_id || 1,
                                rawProd.product_code,
                                rawProd.product_name,
                                100,
                                netQty,
                                netQty,
                                estAmount
                            ]
                        );

                        console.log(` - Inserted MRP Detail: ${rawProd.product_code} (${rawProd.product_name}): Gross=${grossQty}, Net=${netQty}, EstCost=Rp ${estAmount.toLocaleString()}`);
                    }
                }
            } else {
                console.warn(`No BOM found for FG ${fgCode}`);
            }
        }

        // Update totals in `mrps`
        await connection.execute(
            "UPDATE mrps SET total_gross_qty = ?, total_net_qty = ?, total_est_cost = ? WHERE id = ?",
            [totalGrossSum, totalNetSum, totalCostSum, mrpId]
        );

        await connection.commit();
        console.log(`\n======================================================`);
        console.log(`SUCCESS: MRP Transaction created for PO ${po.reference}!`);
        console.log(`MRP ID: ${mrpId} | Reference Code: ${mrpRef}`);
        console.log(`Total Gross Material Qty: ${totalGrossSum.toLocaleString()} pcs/unit`);
        console.log(`Total Net Required Qty: ${totalNetSum.toLocaleString()} pcs/unit`);
        console.log(`Total Estimated Material Purchase Cost: Rp ${totalCostSum.toLocaleString()}`);
        console.log(`======================================================\n`);
        process.exit(0);

    } catch (e) {
        await connection.rollback();
        console.error("Error creating MRP transaction:", e);
        process.exit(1);
    } finally {
        connection.release();
    }
}

createMRPTransaction();
