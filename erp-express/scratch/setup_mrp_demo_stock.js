const db = require('../src/config/db');
const mrpController = require('../src/controllers/mrpController');

async function setupDemoStock() {
    console.log('--- SETTING UP REALISTIC DEMO STOCK & MIN QTY ---');

    // 1. Update min_qty (Stock Std) in products
    const productUpdates = [
        { id: 4970, min_qty: 5, price: 79900 },    // EPCM-CDITONBLK
        { id: 4978, min_qty: 100, price: 3221 },   // EPGS-KGRSPLK1Z
        { id: 4986, min_qty: 100, price: 150 },    // EPLB-KLABCIKVB
        { id: 5004, min_qty: 200, price: 340 },    // EPNS-KNSP4MKWW
        { id: 5020, min_qty: 150, price: 15000 }   // EPPP-MPPGF20SP
    ];

    for (const p of productUpdates) {
        await db.query('UPDATE products SET min_qty = ?, product_price = ? WHERE id = ?', [p.min_qty, p.price, p.id]);
        console.log(`Updated product ${p.id}: min_qty=${p.min_qty}, price=${p.price}`);
    }

    // 2. Update warehouse_stocks to be slightly BELOW requirement
    const stockUpdates = [
        { product_id: 4970, qty_stock: 2 },
        { product_id: 4978, qty_stock: 400 },
        { product_id: 4986, qty_stock: 350 },
        { product_id: 5004, qty_stock: 800 },
        { product_id: 5020, qty_stock: 500 }
    ];

    for (const s of stockUpdates) {
        await db.query('DELETE FROM warehouse_stocks WHERE product_id = ?', [s.product_id]);
        await db.query(
            'INSERT INTO warehouse_stocks (warehouse_id, product_id, qty_stock, created_at, updated_at) VALUES (1, ?, ?, NOW(), NOW())',
            [s.product_id, s.qty_stock]
        );
        console.log(`Updated warehouse stock for product ${s.product_id}: qty_stock=${s.qty_stock}`);
    }

    // 3. Clear old purchase details for these products so on_order_qty is 0 for demo
    const targetProductIds = [4970, 4978, 4986, 5004, 5020];
    await db.query('DELETE FROM purchase_details WHERE product_id IN (?)', [targetProductIds]);
    console.log('Cleared old purchase details for demo products.');

    // 4. Delete existing MRPs and re-generate MRP/EPU/26/08/0010
    await db.query('DELETE FROM mrp_details');
    await db.query('DELETE FROM mrps');

    const req = {
        body: {
            planning_source: 'PO Customer',
            po_customer_id: 4,
            planner_name: 'PPIC Team',
            safety_stock_percent: 5,
            scrap_loss_percent: 2,
            time_frame_start: '2026-08-10',
            time_frame_end: '2026-09-09',
            note: 'Generated with Stock Std & STO'
        }
    };

    const res = {
        status: function(code) {
            this.statusCode = code;
            return this;
        },
        json: function(data) {
            console.log('Controller Response:', data);
            return this;
        }
    };

    await mrpController.generateMRP(req, res);

    const [newMrps] = await db.query('SELECT * FROM mrps ORDER BY id DESC LIMIT 1');
    const newMrp = newMrps[0];
    console.log('\n=======================================');
    console.log('NEW MRP HEADER:', newMrp);

    const [newDetails] = await db.query('SELECT * FROM mrp_details WHERE mrp_id = ?', [newMrp.id]);
    console.log('\nNEW MRP DETAILS BREAKDOWN:');
    console.table(newDetails.map(d => ({
        id: d.id,
        productId: d.product_id,
        needAll: d.need_all_qty,
        stockStd: d.stock_std_qty,
        sto: d.sto_qty,
        netQty: d.net_qty,
        unitPrice: d.unit_price,
        subtotalAmount: d.amount
    })));

    process.exit(0);
}

setupDemoStock().catch(e => {
    console.error(e);
    process.exit(1);
});
