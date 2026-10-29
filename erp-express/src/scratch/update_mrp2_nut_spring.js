const db = require('../config/db');

async function updateMRP2NutSpring() {
    try {
        console.log("=== UPDATING MRP/EPU/26/08/0002 (MRP ID 40) NUT SPRING DATA ===");
        
        // 1. Update MRP Header
        await db.execute(`
            UPDATE mrps
            SET planner_name = 'PPIC Planner',
                total_gross_qty = 5346,
                total_net_qty = 3849,
                total_est_cost = 18468600,
                updated_at = NOW()
            WHERE reference_code = 'MRP/EPU/26/08/0002'
        `);

        // Get MRP ID
        const [mrps] = await db.execute("SELECT id FROM mrps WHERE reference_code = 'MRP/EPU/26/08/0002'");
        if (mrps.length === 0) {
            console.error("MRP/EPU/26/08/0002 not found!");
            process.exit(1);
        }
        const mrpId = mrps[0].id;

        // 2. Delete old details for ID 40 and re-insert accurate details
        await db.execute("DELETE FROM mrp_details WHERE mrp_id = ?", [mrpId]);

        const detailRows = [
            // 1. EPCM-CDITONBLK (DITON) | Need All: 7, Stock Std: +5, STO: 2 => Net Req: 10
            { product_id: 4970, class_type: 'Consumable', source_type: 'Buy', need_all_qty: 7, stock_std_qty: 5, sto_qty: 2, gross_qty: 7, safety_stock_qty: 5, current_stock: 2, net_qty: 10, unit_price: 79900, amount: 799000, supplier_id: 68, part_no_vendor: 'EPCM-CDITONBLK', part_name_vendor: 'DITON', allocation_percent: 100 },

            // 2. EPGS-KGRSPLK1Z (GUARD SPLASH RR) | Need All: 1000, Stock Std: +100, STO: 400 => Net Req: 700
            { product_id: 4978, class_type: 'Raw Material', source_type: 'Buy', need_all_qty: 1000, stock_std_qty: 100, sto_qty: 400, gross_qty: 1000, safety_stock_qty: 100, current_stock: 400, net_qty: 700, unit_price: 3221, amount: 2254700, supplier_id: 46, part_no_vendor: 'EPGS-KGRSPLK1Z', part_name_vendor: 'GUARD SPLASH RR (81265-K1ZA-3101)', allocation_percent: 100 },

            // 3. EPLB-KLABCIKVB (LABEL COOLANT INFO) | Need All: 1000, Stock Std: +100, STO: 350 => Net Req: 750
            { product_id: 4986, class_type: 'Raw Material', source_type: 'Buy', need_all_qty: 1000, stock_std_qty: 100, sto_qty: 350, gross_qty: 1000, safety_stock_qty: 100, current_stock: 350, net_qty: 750, unit_price: 150, amount: 112500, supplier_id: 45, part_no_vendor: 'EPLB-KLABCIKVB', part_name_vendor: 'LABEL COOLANT INFORMATION (87503-KVB-9300)', allocation_percent: 100 },

            // 4. EPNS-KNSP4MKWW (NUT SPRING 4 MM) | Need All: 2000, Stock Std: +200, STO: 800 => Total Net Req: 1400 Pcs!
            // Split across vendors (e.g. 700 Pcs @ GIP 50%, 700 Pcs @ ET 50%)
            { product_id: 5004, class_type: 'Raw Material', source_type: 'Buy', need_all_qty: 2000, stock_std_qty: 200, sto_qty: 800, gross_qty: 2000, safety_stock_qty: 200, current_stock: 800, net_qty: 700, unit_price: 340, amount: 238000, supplier_id: 45, part_no_vendor: 'EPNS-KNSP4MKWW-01', part_name_vendor: 'NUT SPRING 4 MM (GIP)', allocation_percent: 50 },
            { product_id: 5004, class_type: 'Raw Material', source_type: 'Buy', need_all_qty: 2000, stock_std_qty: 200, sto_qty: 800, gross_qty: 2000, safety_stock_qty: 200, current_stock: 800, net_qty: 700, unit_price: 340, amount: 238000, supplier_id: 46, part_no_vendor: 'EPNS-KNSP4MKWW-02', part_name_vendor: 'NUT SPRING 4 MM (ET)', allocation_percent: 50 },

            // 5. EPPP-MPPGF20SP (PP GF 20 SP) | Need All: 1339, Stock Std: +150, STO: 500 => Net Req: 989
            { product_id: 5020, class_type: 'Raw Material', source_type: 'Buy', need_all_qty: 1339, stock_std_qty: 150, sto_qty: 500, gross_qty: 1339, safety_stock_qty: 150, current_stock: 500, net_qty: 989, unit_price: 15000, amount: 14835000, supplier_id: 59, part_no_vendor: 'EPPP-MPPGF20SP', part_name_vendor: 'PP GF 20 SP', allocation_percent: 100 }
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
                row.net_qty, row.net_qty, row.amount, row.allocation_percent
            ]);
        }

        console.log("Successfully updated mrp_details for MRP/EPU/26/08/0002. Nut Spring total net_qty is now 1,400 Pcs (700 + 700)!");
        process.exit(0);
    } catch (e) {
        console.error("Error updating Nut Spring data:", e);
        process.exit(1);
    }
}

updateMRP2NutSpring();
