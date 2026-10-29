const db = require('../src/config/db');

async function cleanZeroMRPs() {
    console.log('--- CLEANING UP OLD 0-QTY DRAFT MRPs ---');
    
    // Find MRPs where total_gross_qty = 0
    const [zeroMRPs] = await db.query('SELECT id, reference_code FROM mrps WHERE total_gross_qty = 0');
    console.log('Found zero-gross MRPs:', zeroMRPs);

    for (const mrp of zeroMRPs) {
        await db.query('DELETE FROM mrp_details WHERE mrp_id = ?', [mrp.id]);
        await db.query('DELETE FROM mrps WHERE id = ?', [mrp.id]);
        console.log(`Deleted old zero MRP: ${mrp.reference_code}`);
    }

    console.log('Cleanup completed.');
    process.exit(0);
}

cleanZeroMRPs().catch(e => {
    console.error(e);
    process.exit(1);
});
