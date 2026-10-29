const db = require('../src/config/db');
const productionController = require('../src/controllers/productionController');

async function testMppCreation() {
    console.log('--- TESTING MPP CREATION (FROM PO / FORECAST / PRODUCT) ---');

    const [products] = await db.query("SELECT id, product_code, product_name FROM products LIMIT 1");
    const [molds] = await db.query("SELECT id, code FROM molds LIMIT 1");
    const [machines] = await db.query("SELECT id, code FROM machines LIMIT 1");

    if (products.length === 0 || molds.length === 0 || machines.length === 0) {
        console.log('Missing products, molds, or machines master data.');
        process.exit(0);
    }

    const product = products[0];
    const mold = molds[0];
    const machine = machines[0];

    const req = {
        body: {
            product_id: product.id,
            mold_id: mold.id,
            machine_id: machine.code,
            operator_name: 'Lead Budi',
            shift: 1,
            target_qty: 1200,
            start_date: new Date().toISOString().substring(0, 10),
            end_date: new Date().toISOString().substring(0, 10),
            note: 'Test MPP from PO/Forecast'
        }
    };

    const res = {
        statusCode: 200,
        status: function(code) { this.statusCode = code; return this; },
        json: function(data) {
            console.log('API RESPONSE (Status ' + this.statusCode + '):', data);
            return this;
        }
    };

    await productionController.createPlanningProduksi(req, res);

    // Verify in database
    const [plans] = await db.query("SELECT * FROM planning_produksi ORDER BY id DESC LIMIT 1");
    console.log('\nLATEST CREATED MPP IN DB:');
    console.table(plans);

    process.exit(0);
}

testMppCreation().catch(e => {
    console.error(e);
    process.exit(1);
});
