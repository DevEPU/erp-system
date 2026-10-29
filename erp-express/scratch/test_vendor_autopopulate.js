const db = require('../src/config/db');
const mrpController = require('../src/controllers/mrpController');

async function testVendorAutopopulate() {
    console.log('--- TESTING VENDOR AUTO-POPULATION IN MRP ---');
    
    // Clear existing MRPs
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
            note: 'Vendor Autopopulate Test'
        }
    };

    const res = {
        status: function(code) { this.statusCode = code; return this; },
        json: function(data) { console.log('Controller Response:', data); return this; }
    };

    await mrpController.generateMRP(req, res);

    const [mrps] = await db.query('SELECT * FROM mrps ORDER BY id DESC LIMIT 1');
    const mrpId = mrps[0].id;

    // Call getMRPDetail controller
    const reqDetail = { params: { id: mrpId } };
    const resDetail = {
        status: function(code) { this.statusCode = code; return this; },
        json: function(data) {
            console.log('\nGET MRP DETAIL RESPONSE:');
            console.table((data.data.details || []).map(d => ({
                productCode: d.product_code,
                productName: d.product_name,
                supplierId: d.supplier_id,
                defaultSupplierId: d.default_supplier_id,
                finalSupplierId: d.final_supplier_id,
                supplierName: d.supplier_name
            })));
            return this;
        }
    };

    await mrpController.getMRPDetail(reqDetail, resDetail);
    process.exit(0);
}

testVendorAutopopulate().catch(e => {
    console.error(e);
    process.exit(1);
});
