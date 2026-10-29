const db = require('../config/db');

async function checkOrCreateMRP2() {
    try {
        console.log("=== CHECKING FOR MRP/EPU/26/08/0002 ===");
        const [existing] = await db.execute("SELECT * FROM mrps WHERE reference_code = 'MRP/EPU/26/08/0002'");
        
        let mrpId;
        if (existing.length > 0) {
            console.log("MRP/EPU/26/08/0002 already exists in DB! Updating planner...");
            mrpId = existing[0].id;
            await db.execute("UPDATE mrps SET planner = 'PPIC Planner' WHERE id = ?", [mrpId]);
        } else {
            console.log("MRP/EPU/26/08/0002 not found. Inserting new MRP transaction...");
            // Get Customer PO CPO/26/08/0001
            const [pos] = await db.execute("SELECT id FROM customer_po WHERE reference = 'CPO/26/08/0001'");
            const poId = pos.length > 0 ? pos[0].id : 1;

            const [result] = await db.execute(`
                INSERT INTO mrps (reference_code, planning_source, po_customer_id, run_date, status, planner, total_gross_req, total_net_req, created_at, updated_at)
                VALUES ('MRP/EPU/26/08/0002', 'CUSTOMER_PO', ?, NOW(), 'CALCULATED', 'PPIC Planner', 1000, 990, NOW(), NOW())
            `, [poId]);
            mrpId = result.insertId;
            console.log("Inserted MRP record ID:", mrpId);
        }

        // Check mrp_details for this mrp_id
        const [details] = await db.execute("SELECT * FROM mrp_details WHERE mrp_id = ?", [mrpId]);
        console.log(`MRP ID ${mrpId} has ${details.length} detail rows.`);

        if (details.length === 0) {
            console.log("Populating mrp_details for MRP/EPU/26/08/0002 with Multi-Vendor product allocation...");

            // Query items with Multi-Vendor mappings
            const mrpDetailItems = [
                // EPTB-KTBACNK60 (TUBE A/C SET K60) - 2 Vendors (50% / 50%)
                { product_id: 4949, rm_code: 'EPTB-KTBACNK60', part_no_vendor: 'EPTB-KTBACNK60-01', supplier_id: 51, allocation_percent: 50, gross_qty: 1000, current_stock: 0, safety_stock_qty: 0, net_qty: 500, unit_price: 13000, amount: 6500000 },
                { product_id: 4949, rm_code: 'EPTB-KTBACNK60', part_no_vendor: 'EPTB-KTBACNK60-02', supplier_id: 62, allocation_percent: 50, gross_qty: 1000, current_stock: 0, safety_stock_qty: 0, net_qty: 500, unit_price: 12400, amount: 6200000 },

                // EPDC-KDCTACK1A (DUCT A/C) - 2 Vendors (50% / 50%)
                { product_id: 4971, rm_code: 'EPDC-KDCTACK1A', part_no_vendor: 'EPDC-KDCTACK1A-01', supplier_id: 51, allocation_percent: 50, gross_qty: 1000, current_stock: 0, safety_stock_qty: 0, net_qty: 500, unit_price: 4653, amount: 2326500 },
                { product_id: 4971, rm_code: 'EPDC-KDCTACK1A', part_no_vendor: 'EPDC-KDCTACK1A-02', supplier_id: 52, allocation_percent: 50, gross_qty: 1000, current_stock: 0, safety_stock_qty: 0, net_qty: 500, unit_price: 4599, amount: 2299500 },

                // EPBS-KBRSLOK0J (BAR SEAT LOCK K0JA) - 3 Vendors (30% / 35% / 35%)
                { product_id: 4949, rm_code: 'EPBS-KBRSLOK0J', part_no_vendor: 'EPBS-KBRSLOK0J-01', supplier_id: 42, allocation_percent: 30, gross_qty: 2000, current_stock: 0, safety_stock_qty: 0, net_qty: 600, unit_price: 963, amount: 577800 },
                { product_id: 4949, rm_code: 'EPBS-KBRSLOK0J', part_no_vendor: 'EPBS-KBRSLOK0J-02', supplier_id: 43, allocation_percent: 35, gross_qty: 2000, current_stock: 0, safety_stock_qty: 0, net_qty: 700, unit_price: 940, amount: 658000 },
                { product_id: 4949, rm_code: 'EPBS-KBRSLOK0J', part_no_vendor: 'EPBS-KBRSLOK0J-03', supplier_id: 44, allocation_percent: 35, gross_qty: 2000, current_stock: 0, safety_stock_qty: 0, net_qty: 700, unit_price: 942, amount: 659400 },

                // EPPP-MPPGF20SP (PP GF 20 SP) - Single Vendor (100%)
                { product_id: 4955, rm_code: 'EPPP-MPPGF20SP', part_no_vendor: 'EPPP-MPPGF20SP', supplier_id: 62, allocation_percent: 100, gross_qty: 1339, current_stock: 2463, safety_stock_qty: 150, net_qty: 0, unit_price: 15000, amount: 0 },

                // EPNS-KNSP4MKWW (NUT SPRING 4 MM) - Single Vendor (100%)
                { product_id: 4948, rm_code: 'EPNS-KNSP4MKWW', part_no_vendor: 'EPNS-KNSP4MKWW-01', supplier_id: 43, allocation_percent: 100, gross_qty: 2000, current_stock: 1210, safety_stock_qty: 200, net_qty: 990, unit_price: 340, amount: 336600 }
            ];

            for (const item of mrpDetailItems) {
                await db.execute(`
                    INSERT INTO mrp_details (mrp_id, product_id, part_no_vendor, supplier_id, allocation_percent, gross_qty, current_stock, safety_stock_qty, net_qty, unit_price, amount, status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CALCULATED', NOW(), NOW())
                `, [mrpId, item.product_id, item.part_no_vendor, item.supplier_id, item.allocation_percent, item.gross_qty, item.current_stock, item.safety_stock_qty, item.net_qty, item.unit_price, item.amount]);
            }
            console.log("Successfully inserted detail items for MRP/EPU/26/08/0002!");
        }

        process.exit(0);
    } catch (e) {
        console.error("Error creating MRP/EPU/26/08/0002:", e);
        process.exit(1);
    }
}

checkOrCreateMRP2();
