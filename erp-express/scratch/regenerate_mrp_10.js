const db = require('../src/config/db');
const mrpController = require('../src/controllers/mrpController');

async function testReGenerate() {
    console.log('--- CLEANING UP OLD MRP 17 AND RE-GENERATING ---');
    await db.query('DELETE FROM mrp_details WHERE mrp_id = 17');
    await db.query('DELETE FROM mrps WHERE id = 17');

    const req = {
        body: {
            planning_source: 'PO Customer',
            po_customer_id: 4,
            planner_name: 'PPIC Team',
            safety_stock_percent: 0,
            scrap_loss_percent: 0,
            time_frame_start: '2026-08-10',
            time_frame_end: '2026-09-09',
            note: 'Generated after fix'
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
    console.log('New MRP Header:', newMrp);

    const [newDetails] = await db.query('SELECT * FROM mrp_details WHERE mrp_id = ?', [newMrp.id]);
    console.log('New MRP Details:', newDetails);

    process.exit(0);
}

testReGenerate().catch(e => {
    console.error(e);
    process.exit(1);
});
