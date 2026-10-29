const productController = require('../src/controllers/productController');

async function simulate() {
    try {
        let resJson = null;
        const resMock = {
            status: () => resMock,
            json: (data) => { resJson = data; }
        };
        
        console.log('=== SIMULATING getProducts (parent_only = true) ===');
        await productController.getProducts({
            query: { parent_only: 'true', limit: 100 }
        }, resMock);
        
        const filtered = resJson.data.filter(p => p.id === 10000);
        console.log(JSON.stringify(filtered, null, 2));

        console.log('=== SIMULATING getProducts (parent_only = false) ===');
        await productController.getProducts({
            query: { parent_only: 'false', limit: 100 }
        }, resMock);
        
        const filtered2 = resJson.data.filter(p => p.id === 10000);
        console.log(JSON.stringify(filtered2, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

simulate();
