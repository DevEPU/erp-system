const mysql = require('mysql2/promise');

async function revertMRPToWaitingApproval() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    try {
        console.log('--- 1. Finding MRP/EPU/26/08/0002 ---');
        const [mrps] = await pool.execute('SELECT * FROM mrps WHERE reference_code = ?', ['MRP/EPU/26/08/0002']);
        if (mrps.length === 0) {
            console.log('MRP not found!');
            return;
        }
        const mrp = mrps[0];
        console.log(`Found MRP #${mrp.id} (${mrp.reference_code}) with status: ${mrp.status}`);

        // Find purchases (PRs) linked to this MRP
        const [purchases] = await pool.execute(`
            SELECT id, reference, status, note 
            FROM purchases 
            WHERE note LIKE ?`,
            [`%${mrp.reference_code}%`]
        );
        console.log(`Found ${purchases.length} purchases linked:`);
        purchases.forEach(p => console.log(`- PR #${p.id} (${p.reference}) | Status: ${p.status} | Note: ${p.note}`));

        const mrpPurchases = purchases;

        console.log(`\n--- 2. Deleting PRs released from ${mrp.reference_code} ---`);
        for (const p of mrpPurchases) {
            console.log(`Deleting purchase details for PR #${p.id} (${p.reference})...`);
            await pool.execute('DELETE FROM purchase_details WHERE purchase_id = ?', [p.id]);
            console.log(`Deleting PR #${p.id}...`);
            await pool.execute('DELETE FROM purchases WHERE id = ?', [p.id]);
        }

        console.log(`\n--- 3. Resetting mrp_details qty_released_pr to 0 for MRP #${mrp.id} ---`);
        await pool.execute('UPDATE mrp_details SET qty_released_pr = 0 WHERE mrp_id = ?', [mrp.id]);

        console.log(`\n--- 4. Updating MRP #${mrp.id} status to 'Waiting for Approval' ---`);
        await pool.execute('UPDATE mrps SET status = ? WHERE id = ?', ['Waiting for Approval', mrp.id]);

        // Clean up old approval logs/requests and re-create initial 3-level approval request
        console.log(`\n--- 5. Resetting approval requests for MRP #${mrp.id} ---`);
        const [existingReqs] = await pool.execute(
            `SELECT id FROM approval_requests WHERE (requestable_type = 'mrp' OR requestable_type = 'MRP') AND requestable_id = ?`,
            [mrp.id]
        );
        for (const req of existingReqs) {
            await pool.execute('DELETE FROM approval_request_logs WHERE approval_request_id = ?', [req.id]);
            await pool.execute('DELETE FROM approval_requests WHERE id = ?', [req.id]);
        }

        // Find approval rule for MRP
        const [types] = await pool.execute(
            `SELECT id FROM approval_types WHERE approval_code = 'MRP' OR approval_name LIKE '%MRP%' LIMIT 1`
        );
        const typeId = types.length > 0 ? types[0].id : 1;

        const [rules] = await pool.execute(
            `SELECT * FROM approval_rules WHERE approval_types_id = ? AND is_active = 1 ORDER BY level ASC`,
            [typeId]
        );

        const [newReq] = await pool.execute(
            `INSERT INTO approval_requests (requestable_type, requestable_id, approval_types_id, amount, current_level, status, created_by, created_at, updated_at)
             VALUES ('mrp', ?, ?, ?, 1, 'Waiting for Approval', 1, NOW(), NOW())`,
            [mrp.id, typeId, mrp.total_est_cost || 0]
        );
        const reqId = newReq.insertId;

        // Insert logs for rules
        for (const r of rules) {
            await pool.execute(
                `INSERT INTO approval_request_logs (approval_request_id, approval_rule_id, level, status, approver_id, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
                [reqId, r.id, r.level, r.level === 1 ? 'Pending' : 'Waiting', r.approver_id || null]
            );
        }

        console.log('Successfully reverted MRP/EPU/26/08/0002 to Waiting for Approval and deleted linked PRs!');

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await pool.end();
    }
}

revertMRPToWaitingApproval();
