const db = require('../config/db');

async function checkPO() {
    try {
        console.log("Searching for PO 'CPO/26/08/0001'...");
        const [pos] = await db.execute(
            "SELECT * FROM customer_po WHERE no_po_customer = ? OR reference = ?", 
            ['CPO/26/08/0001', 'CPO/26/08/0001']
        );
        console.log("Customer POs found:", JSON.stringify(pos, null, 2));

        if (pos.length > 0) {
            const poId = pos[0].id;
            const [details] = await db.execute(
                "SELECT * FROM customer_po_details WHERE po_id = ?",
                [poId]
            );
            console.log("Customer PO Details:", JSON.stringify(details, null, 2));
        } else {
            console.log("PO not found in customer_po. Checking sales_orders or purchase_orders...");
            const [allPOs] = await db.execute("SELECT id, reference, no_po_customer FROM customer_po LIMIT 10");
            console.log("Sample customer_po records:", JSON.stringify(allPOs, null, 2));
        }

        const [mrpRows] = await db.execute("SELECT * FROM mrp_runs ORDER BY id DESC LIMIT 5").catch(() => [[], []]);
        console.log("MRP Runs table check:", JSON.stringify(mrpRows, null, 2));

        process.exit(0);
    } catch (e) {
        console.error("Error checking PO:", e);
        process.exit(1);
    }
}

checkPO();
