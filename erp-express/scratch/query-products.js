const db = require('../src/config/db');

async function check() {
    try {
        const [rows] = await db.query(
            "SELECT id, product_code, product_name FROM products WHERE product_name LIKE '%LUGGAGE%' OR product_name LIKE '%STYLISH%' OR product_code LIKE '%K1Z%' OR product_code LIKE '%BMST%'"
        );
        console.log("MATCHING PRODUCTS:");
        console.log(JSON.stringify(rows, null, 2));
        
        const [boms] = await db.query(
            "SELECT id, bom_code, bom_name, finished_good_code, finished_good_name FROM boms"
        );
        console.log("\nALL BOMS:");
        console.log(JSON.stringify(boms, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
check();
