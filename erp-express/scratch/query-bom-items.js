const db = require('../src/config/db');

async function check() {
    try {
        const [items22] = await db.query(
            "SELECT * FROM bom_items WHERE bom_id = 22"
        );
        console.log("BOM 22 ITEMS (BOX LUGGAGE K1Z):");
        console.log(JSON.stringify(items22, null, 2));

        const [items20] = await db.query(
            "SELECT * FROM bom_items WHERE bom_id = 20"
        );
        console.log("\nBOM 20 ITEMS (BACK MRR STYLISH RL HD):");
        console.log(JSON.stringify(items20, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
check();
