const mysql = require('mysql2/promise');

async function revertMRPToDraft() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        console.log('--- 1. Reverting MRP/EPU/26/08/0002 (ID: 55) to Draft ---');
        
        // Update MRP status to Draft
        await connection.execute(
            "UPDATE mrps SET status = 'Draft', updated_at = NOW() WHERE reference_code = 'MRP/EPU/26/08/0002' OR id = 55"
        );

        // Reset qty_released_pr to 0 on all details
        await connection.execute(
            "UPDATE mrp_details SET qty_released_pr = 0 WHERE mrp_id = 55"
        );

        // Delete approval requests and logs
        const [appReqs] = await connection.execute(
            "SELECT id FROM approval_requests WHERE (requestable_type = 'mrp' OR requestable_type = 'MRP' OR requestable_type LIKE '%MRP%') AND requestable_id = 55"
        );
        console.log(`Found ${appReqs.length} approval requests to clean up:`, appReqs);

        for (const req of appReqs) {
            await connection.execute('DELETE FROM approval_request_logs WHERE approval_request_id = ?', [req.id]);
            await connection.execute('DELETE FROM approval_requests WHERE id = ?', [req.id]);
        }

        await connection.commit();
        console.log('✅ Successfully reverted MRP/EPU/26/08/0002 to clean Draft status (before approval)!');

        // Verify status
        const [verify] = await pool.execute('SELECT id, reference_code, status FROM mrps WHERE id = 55');
        console.log(`Final status: ${verify[0].reference_code} -> ${verify[0].status}`);

    } catch (e) {
        await connection.rollback();
        console.error('Error:', e);
    } finally {
        connection.release();
        await pool.end();
    }
}

revertMRPToDraft();
