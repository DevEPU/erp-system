const db = require('../config/db');

async function updateMRP2ExactMath() {
    try {
        console.log("=== UPDATING MRP/EPU/26/08/0002 EXACT MATHEMATICAL FIELDS ===");

        const [mrps] = await db.execute("SELECT id FROM mrps WHERE reference_code = 'MRP/EPU/26/08/0002'");
        if (mrps.length === 0) {
            console.error("MRP/EPU/26/08/0002 not found!");
            process.exit(1);
        }
        const mrpId = mrps[0].id;

        await db.execute("DELETE FROM mrp_details WHERE mrp_id = ?", [mrpId]);

        const detailRows = [
            // 1. EPCM-CDITONBLK | Gross: 7, Safety: 5, Stock: 2 => Net Req: 10 | Quota: 100% => Allocated: 10
            { product_id: 4970, class_type: 'Consumable', source_type: 'Buy', need_all_qty: 7, stock_std_qty: 5, sto_qty: 2, gross_qty: 7, safety_stock_qty: 5, current_stock: 2, net_qty: 10, ord_qty: 10, unit_price: 79900, amount: 799000, supplier_id: 68, part_no_vendor: 'EPCM-CDITONBLK', part_name_vendor: 'DITON', allocation_percent: 100 },

            // 2. EPGS-KGRSPLK1Z | Gross: 1000, Safety: 100, Stock: 400 => Net Req: 700 | Quota: 100% => Allocated: 700
            { product_id: 4978, class_type: 'Raw Material', source_type: 'Buy', need_all_qty: 1000, stock_std_qty: 100, sto_qty: 400, gross_qty: 1000, safety_stock_qty: 100, current_stock: 400, net_qty: 700, ord_qty: 700, unit_price: 3221, amount: 2254700, supplier_id: 46, part_no_vendor: 'EPGS-KGRSPLK1Z', part_name_vendor: 'GUARD SPLASH RR (81265-K1ZA-3101)', allocation_percent: 100 },

            // 3. EPLB-KLABCIKVB | Gross: 1000, Safety: 100, Stock: 350 => Net Req: 750 | Quota: 100% => Allocated: 750
            { product_id: 4986, class_type: 'Raw Material', source_type: 'Buy', need_all_qty: 1000, stock_std_qty: 100, sto_qty: 350, gross_qty: 1000, safety_stock_qty: 100, current_stock: 350, net_qty: 750, ord_qty: 750, unit_price: 150, amount: 112500, supplier_id: 45, part_no_vendor: 'EPLB-KLABCIKVB', part_name_vendor: 'LABEL COOLANT INFORMATION (87503-KVB-9300)', allocation_percent: 100 },

            // 4. EPNS-KNSP4MKWW (Vendor 1: GIP 50%) | Gross: 2000, Safety: 200, Stock: 800 => Total Net Req: 1400 Pcs | Quota: 50% => Allocated: 700 Pcs
            { product_id: 5004, class_type: 'Raw Material', source_type: 'Buy', need_all_qty: 2000, stock_std_qty: 200, sto_qty: 800, gross_qty: 2000, safety_stock_qty: 200, current_stock: 800, net_qty: 1400, ord_qty: 700, unit_price: 340, amount: 238000, supplier_id: 45, part_no_vendor: 'EPNS-KNSP4MKWW-01', part_name_vendor: 'NUT SPRING 4 MM (GIP)', allocation_percent: 50 },

            // 5. EPNS-KNSP4MKWW (Vendor 2: ET 50%) | Gross: 2000, Safety: 200, Stock: 800 => Total Net Req: 1400 Pcs | Quota: 50% => Allocated: 700 Pcs
            { product_id: 5004, class_type: 'Raw Material', source_type: 'Buy', need_all_qty: 2000, stock_std_qty: 200, sto_qty: 800, gross_qty: 2000, safety_stock_qty: 200, current_stock: 800, net_qty: 1400, ord_qty: 700, unit_price: 340, amount: 238000, supplier_id: 46, part_no_vendor: 'EPNS-KNSP4MKWW-02', part_name_vendor: 'NUT SPRING 4 MM (ET)', allocation_percent: 50 },

            // 6. EPPP-MPPGF20SP | Gross: 1339, Safety: 150, Stock: 500 => Net Req: 989 | Quota: 100% => Allocated: 989 KG
            { product_id: 5020, class_type: 'Raw Material', source_type: 'Buy', need_all_qty: 1339, stock_std_qty: 150, sto_qty: 500, gross_qty: 1339, safety_stock_qty: 150, current_stock: 500, net_qty: 989, ord_qty: 989, unit_price: 15000, amount: 14835000, supplier_id: 59, part_no_vendor: 'EPPP-MPPGF20SP', part_name_vendor: 'PP GF 20 SP', allocation_percent: 100 }
        ];

        for (const row of detailRows) {
            await db.execute(`
                INSERT INTO mrp_details (
                    mrp_id, product_id, class_type, source_type, need_all_qty, stock_std_qty, sto_qty,
                    gross_qty, safety_stock_qty, current_stock, on_order_qty, qty_required, net_qty,
                    unit_price, subtotal_cost, bom_ref, supplier_id, part_no_vendor, part_name_vendor,
                    ord_qty, mrp_qty, amount, allocation_percent, qty_released_pr, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'BOM-21/ASKI/567', ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())
            `, [
                mrpId, row.product_id, row.class_type, row.source_type, row.need_all_qty, row.stock_std_qty, row.sto_qty,
                row.gross_qty, row.safety_stock_qty, row.current_stock, row.net_qty, row.net_qty,
                row.unit_price, row.amount, row.supplier_id, row.part_no_vendor, row.part_name_vendor,
                row.ord_qty, row.ord_qty, row.amount, row.allocation_percent
            ]);
        }

        console.log("Successfully updated mrp_details for MRP/EPU/26/08/0002! Total Net Req = 1,400 Pcs and Allocated Order Qty = 700 Pcs (50% of 1,400)!");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

updateMRP2ExactMath();
