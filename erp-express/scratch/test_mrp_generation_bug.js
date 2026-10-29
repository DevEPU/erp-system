const db = require('../src/config/db');

async function testMRPBug() {
    console.log('--- TESTING MRP CALCULATION ON LATEST PO ---');
    
    // Find latest PO
    const [pos] = await db.query('SELECT * FROM customer_po ORDER BY id DESC LIMIT 1');
    if (pos.length === 0) return console.log('No PO found');
    
    const po = pos[0];
    console.log('PO Header:', po);

    const [poDetails] = await db.query('SELECT * FROM customer_po_details WHERE po_id = ?', [po.id]);
    console.log('PO Details:', poDetails);

    for (const item of poDetails) {
        console.log(`Checking PO Item: code=${item.product_code}, po_qty=${item.po_qty}, quantity=${item.quantity}`);

        const [bomRows] = await db.query(
            "SELECT * FROM boms WHERE finished_good_code = ?",
            [item.product_code]
        );
        console.log(`Found BOMs for code ${item.product_code}:`, bomRows.length);
        if (bomRows.length > 0) {
            console.log('  BOM details:', bomRows[0]);
            const [bomItems] = await db.query("SELECT * FROM bom_items WHERE bom_id = ?", [bomRows[0].id]);
            console.log(`  BOM Items count: ${bomItems.length}`);
            console.log('  Sample BOM items:', bomItems.slice(0, 3));
        }
    }

    process.exit(0);
}

testMRPBug().catch(e => {
    console.error(e);
    process.exit(1);
});
