const db = require('../src/config/db');
const mrpController = require('../src/controllers/mrpController');

async function testSaveSplitMRP() {
    console.log('--- TESTING SAVE SPLIT VENDOR ROWS IN MRP ---');
    
    const [mrps] = await db.query('SELECT id FROM mrps ORDER BY id DESC LIMIT 1');
    if (mrps.length === 0) {
        console.log('No MRP found.');
        process.exit(0);
    }

    const mrpId = mrps[0].id;
    console.log('Testing update on MRP ID:', mrpId);

    // Fetch existing details
    const [details] = await db.query('SELECT * FROM mrp_details WHERE mrp_id = ?', [mrpId]);
    console.log('Original details count:', details.length);

    // Create a split payload: take item 0, split into 2
    const itemToSplit = details[0];
    const halfQty = Math.floor(Number(itemToSplit.ord_qty || 10) / 2);
    const remQty = Math.ceil(Number(itemToSplit.ord_qty || 10) / 2);

    const payloadDetails = [
        {
            id: itemToSplit.id,
            product_id: itemToSplit.product_id,
            supplier_id: itemToSplit.supplier_id,
            part_no_vendor: itemToSplit.part_no_vendor,
            part_name_vendor: itemToSplit.part_name_vendor,
            ord_qty: halfQty,
            mrp_qty: halfQty,
            unit_price: Number(itemToSplit.unit_price || 100),
            amount: halfQty * Number(itemToSplit.unit_price || 100)
        },
        // NEW SPLIT ROW (no DB id)
        {
            product_id: itemToSplit.product_id,
            supplier_id: 46, // secondary supplier
            part_no_vendor: 'SPLIT-TEST-PART',
            part_name_vendor: itemToSplit.part_name_vendor,
            ord_qty: remQty,
            mrp_qty: remQty,
            unit_price: Number(itemToSplit.unit_price || 100),
            amount: remQty * Number(itemToSplit.unit_price || 100)
        },
        ...details.slice(1).map(d => ({
            id: d.id,
            product_id: d.product_id,
            supplier_id: d.supplier_id,
            part_no_vendor: d.part_no_vendor,
            part_name_vendor: d.part_name_vendor,
            ord_qty: Number(d.ord_qty),
            mrp_qty: Number(d.mrp_qty),
            unit_price: Number(d.unit_price),
            amount: Number(d.amount)
        }))
    ];

    const req = {
        params: { id: mrpId },
        body: {
            planner_name: 'PPIC Planner Test',
            details: payloadDetails
        }
    };

    const res = {
        status: function(code) { this.statusCode = code; return this; },
        json: function(data) { console.log('Update Response:', data); return this; }
    };

    await mrpController.updateMRP(req, res);

    // Verify DB details after update
    const [afterDetails] = await db.query('SELECT id, product_id, supplier_id, part_no_vendor, ord_qty, mrp_qty, amount FROM mrp_details WHERE mrp_id = ?', [mrpId]);
    console.log('\nDETAILS IN DB AFTER SAVE (count:', afterDetails.length, '):');
    console.table(afterDetails);

    process.exit(0);
}

testSaveSplitMRP().catch(e => {
    console.error(e);
    process.exit(1);
});
