const mysql = require('mysql2/promise');

async function cleanAllPRs() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    try {
        console.log('--- 1. Finding all PRs created from MRPs ---');
        const [purchases] = await pool.execute(`
            SELECT id, reference, note, status 
            FROM purchases 
            WHERE note LIKE '%MRP%' OR reference LIKE 'PR/PPIC-EPU/%'
        `);
        console.log(`Found ${purchases.length} PRs:`);
        purchases.forEach(p => console.log(`- PR #${p.id} (${p.reference}) | ${p.status} | ${p.note}`));

        for (const p of purchases) {
            console.log(`Deleting details for PR #${p.id}...`);
            await pool.execute('DELETE FROM purchase_details WHERE purchase_id = ?', [p.id]);
            console.log(`Deleting PR #${p.id}...`);
            await pool.execute('DELETE FROM purchases WHERE id = ?', [p.id]);
        }

        console.log('\n--- 2. Resetting qty_released_pr on all mrp_details ---');
        await pool.execute('UPDATE mrp_details SET qty_released_pr = 0');

        console.log('\n--- 3. Updating MRP statuses to Approved / Waiting for Approval ---');
        const [mrps] = await pool.execute('SELECT id, reference_code, status FROM mrps');
        for (const m of mrps) {
            console.log(`- MRP #${m.id} (${m.reference_code}) current status: ${m.status}`);
            if (m.status === 'Released') {
                await pool.execute("UPDATE mrps SET status = 'Approved' WHERE id = ?", [m.id]);
                console.log(`  -> Reset MRP #${m.id} from Released to Approved`);
            }
        }

        console.log('\n✅ All PR transactions deleted & all MRPs reset to clean pre-release state!');

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await pool.end();
    }
}

cleanAllPRs();
