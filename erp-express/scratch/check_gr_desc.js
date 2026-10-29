const db = require('../src/config/db');
async function check() {
    try {
        const [grDesc] = await db.query('DESCRIBE goods_receipts');
        console.log('goods_receipts schema:', grDesc);
        
        const [grdDesc] = await db.query('DESCRIBE goods_receipt_details');
        console.log('goods_receipt_details schema:', grdDesc);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
