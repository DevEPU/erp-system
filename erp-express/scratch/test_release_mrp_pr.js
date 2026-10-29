const db = require('../src/config/db');
const mrpController = require('../src/controllers/mrpController');

async function testReleaseMRPToPR() {
    console.log('--- TESTING RELEASE MRP TO PR (GROUPED PER VENDOR) ---');

    // Reset status of latest MRP to Draft and reset qty_released_pr
    const [mrps] = await db.query("SELECT id, reference_code FROM mrps ORDER BY id DESC LIMIT 1");
    if (mrps.length === 0) {
        console.log('No MRP found.');
        process.exit(0);
    }

    const mrp = mrps[0];
    await db.query("UPDATE mrps SET status = 'Draft' WHERE id = ?", [mrp.id]);
    await db.query("UPDATE mrp_details SET qty_released_pr = 0 WHERE mrp_id = ?", [mrp.id]);

    console.log('Releasing MRP ID:', mrp.id, 'Ref:', mrp.reference_code);

    const req = {
        params: { id: mrp.id },
        user: { id: 1 }
    };

    const res = {
        status: function(code) { this.statusCode = code; return this; },
        json: function(data) {
            console.log('\nRELEASE API RESPONSE:', data);
            return this;
        }
    };

    await mrpController.releaseMRPToPR(req, res);

    // Inspect created purchases (PRs) in DB
    const [prs] = await db.query(
        "SELECT id, reference, supplier_id, supplier_name, total_amount, status FROM purchases WHERE note LIKE ? ORDER BY id DESC",
        [`%${mrp.reference_code}%`]
    );

    console.log('\nGENERATED PURCHASE REQUESTS (PRs):');
    console.table(prs);

    for (const pr of prs) {
        const [items] = await db.query(
            "SELECT id, product_code, product_name, quantity, price, sub_total FROM purchase_details WHERE purchase_id = ?",
            [pr.id]
        );
        console.log(`\nPR ${pr.reference} (Supplier: ${pr.supplier_name || 'No Vendor'}) ITEMS:`);
        console.table(items);
    }

    process.exit(0);
}

testReleaseMRPToPR().catch(e => {
    console.error(e);
    process.exit(1);
});
