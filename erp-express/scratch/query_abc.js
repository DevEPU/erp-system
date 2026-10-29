const db = require('../src/config/db');

async function queryAbc() {
    try {
        const [products] = await db.query("SELECT * FROM products WHERE product_name LIKE '%ABC%' OR product_code LIKE '%ABC%'");
        console.log('--- PRODUCTS MATCHING ABC ---');
        console.log(products);

        const [suppliers] = await db.query("SELECT * FROM product_suppliers");
        console.log('--- ALL PRODUCT SUPPLIERS ---');
        console.log(suppliers);
        
        const [units] = await db.query("SELECT * FROM product_units WHERE product_id = 10000");
        console.log('--- PRODUCT UNITS ---');
        console.log(units);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

queryAbc();
