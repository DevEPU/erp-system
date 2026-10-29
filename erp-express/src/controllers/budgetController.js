const db = require('../config/db');
const budgetService = require('../services/budgetService');
const approvalService = require('../services/approvalService');

// Utility function for BigInt serialization
const serialize = (data) => JSON.parse(JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
));

// 1. Master Budgets
exports.getMasterBudgets = async (req, res) => {
    try {
        const { status, year, month, department_id, is_active } = req.query;
        let query = `
            SELECT mb.*, d.department_name, ts.target_amount as current_target_amount 
            FROM master_budget mb 
            LEFT JOIN departments d ON mb.department_id = d.id
            LEFT JOIN target_sales ts ON mb.target_sales_id = ts.id
        `;
        let params = [];
        let conditions = [];

        if (status && status !== 'all') {
            conditions.push('mb.status = ?');
            params.push(status.toLowerCase());
        }
        if (year && year !== 'all') {
            conditions.push('YEAR(mb.tgl_penyusunan) = ?');
            params.push(year);
        }
        if (month && month !== 'all') {
            conditions.push('MONTH(mb.tgl_penyusunan) = ?');
            params.push(month);
        }
        if (department_id && department_id !== 'all') {
            conditions.push('mb.department_id = ?');
            params.push(department_id);
        }
        if (is_active !== undefined && is_active !== 'all') {
            conditions.push('mb.is_active = ?');
            params.push(is_active === '1' || is_active === 'true' || is_active === 1 ? 1 : 0);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY mb.id DESC';
        const [rows] = await db.execute(query, params);

        // Fetch details for each budget
        const budgetsWithDetails = await Promise.all(rows.map(async (budget) => {
            const [details] = await db.execute('SELECT * FROM budget_details WHERE master_budget_id = ?', [budget.id]);
            
            // Map department info into a nested object for Laravel parity
            const budgetWithDept = {
                ...budget,
                department: {
                    id: budget.department_id,
                    department_name: budget.department_name
                },
                details: details
            };

            // Fetch approval request
            const [approvals] = await db.execute(
                'SELECT * FROM approval_requests WHERE requestable_id = ? AND requestable_type LIKE "%MasterBudget" LIMIT 1', 
                [budget.id]
            );
            
            let approvalRequest = null;
            if (approvals.length > 0) {
                approvalRequest = serialize(approvals[0]);
                const [logs] = await db.execute(`
                    SELECT al.*, u.name as user_name 
                    FROM approval_request_logs al
                    JOIN users u ON al.user_id = u.id
                    WHERE al.approval_request_id = ?
                `, [approvalRequest.id]);
                
                approvalRequest.logs = logs.map(l => ({
                    ...l,
                    user: { name: l.user_name } // Match frontend user nested object
                }));
            }

            return {
                ...budgetWithDept,
                approval_request: approvalRequest
            };
        }));

        return res.json({ data: serialize(budgetsWithDetails) });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.createMasterBudget = async (req, res) => {
    const { tgl_penyusunan, bulan, department_id, grandtotal, description, is_mandatory, items, target_sales_id, target_sales_amount, total_percentage } = req.body;
    const userId = req.user?.id || req.body.user_id || 1;

    // Begin Transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        // 1. Generate Number (Format: BDGT/{deptCode}-EPU/{typeCode}/{year}/{monthSequence})
        // Get Dept Code
        let deptCode = 'GEN';
        if (department_id) {
            const [depts] = await connection.execute('SELECT department_code FROM departments WHERE id = ?', [department_id]);
            if (depts.length > 0 && depts[0].department_code) {
                deptCode = depts[0].department_code;
            }
        }

        const dateObj = new Date(tgl_penyusunan);
        const yearShort = dateObj.getFullYear().toString().slice(-2);
        const monthPad = String(bulan).padStart(2, '0');
        const typeCode = is_mandatory ? 'MAN' : 'NON';

        // Count existing for sequence
        const searchPattern = `BDGT/${deptCode}-EPU/${typeCode}/${yearShort}/${monthPad}%`;
        const [seqRows] = await connection.execute(
            'SELECT COUNT(*) as count FROM master_budget WHERE no_budgeting LIKE ?',
            [searchPattern]
        );
        const sequence = (seqRows[0].count + 1);
        const noBudgeting = `BDGT/${deptCode}-EPU/${typeCode}/${yearShort}/${monthPad}${sequence}`;

        // 2. Calculate Period
        const year = dateObj.getFullYear();
        const periode_awal = `${year}-${monthPad}-01`;
        const lastDay = new Date(year, bulan, 0).getDate();
        const periode_akhir = `${year}-${monthPad}-${lastDay}`;

        // 3. Insert Master
        const formattedTgl = new Date(tgl_penyusunan).toISOString().split('T')[0];
        const [result] = await connection.execute(
            'INSERT INTO master_budget (no_budgeting, tgl_penyusunan, bulan, periode_awal, periode_akhir, department_id, description, grandtotal, status, is_mandatory, used_amount, reserved_amount, target_sales_id, target_sales_amount, total_percentage, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, NOW(), NOW())',
            [noBudgeting, formattedTgl, bulan, periode_awal, periode_akhir, department_id, description, grandtotal, 'Pending', is_mandatory ? 1 : 0, target_sales_id, target_sales_amount, total_percentage, userId]
        );
        
        const masterId = result.insertId;

        // 4. Insert Details
        if (items && Array.isArray(items)) {
            for (let item of items) {
                await connection.execute(
                    'INSERT INTO budget_details (master_budget_id, category_id, category_name, budget, percentage, used_amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, NOW(), NOW())',
                    [masterId, item.category_id, item.category_name, item.budget, item.percentage]
                );
            }
        }

        // 5. Create Approval Request
        const [types] = await connection.execute('SELECT id FROM approval_types WHERE approval_code = "Budget" LIMIT 1');
        if (types.length > 0) {
            await approvalService.createRequest(
                'Modules\\Budget\\Entities\\MasterBudget', // modelClass for Laravel compatibility
                masterId,
                types[0].id,
                grandtotal,
                userId,
                connection
            );
        }

        await connection.commit();
        return res.status(201).json({ message: 'Budget created successfully', masterId: masterId.toString(), no_budgeting: noBudgeting });
    } catch (error) {
        await connection.rollback();
        console.error('Master Budget Creation Error:', error);
        res.status(500).json({ message: 'Transaction failed: ' + error.message });
    } finally {
        connection.release();
    }
};

exports.updateMasterBudget = async (req, res) => {
    const { id } = req.params;
    const { tgl_penyusunan, bulan, department_id, grandtotal, description, is_mandatory, items, target_sales_id, target_sales_amount, total_percentage } = req.body;

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        // 1. Check if exists and status is Pending
        const [budgets] = await connection.execute('SELECT * FROM master_budget WHERE id = ?', [id]);
        if (budgets.length === 0) return res.status(404).json({ message: 'Master budget not found' });
        
        const budget = budgets[0];
        if (budget.status.toLowerCase() !== 'pending') {
            return res.status(403).json({ message: 'Hanya Master Budget dengan status "Pending" yang dapat diedit.' });
        }

        // 2. Calculate Period
        const dateObj = new Date(tgl_penyusunan);
        const year = dateObj.getFullYear();
        const monthPad = String(bulan).padStart(2, '0');
        const periode_awal = `${year}-${monthPad}-01`;
        const lastDay = new Date(year, bulan, 0).getDate();
        const periode_akhir = `${year}-${monthPad}-${lastDay}`;

        // 3. Update Master
        const formattedTgl = new Date(tgl_penyusunan).toISOString().split('T')[0];
        await connection.execute(
            'UPDATE master_budget SET tgl_penyusunan = ?, bulan = ?, periode_awal = ?, periode_akhir = ?, department_id = ?, description = ?, grandtotal = ?, is_mandatory = ?, target_sales_id = ?, target_sales_amount = ?, total_percentage = ?, updated_at = NOW() WHERE id = ?',
            [formattedTgl, bulan, periode_awal, periode_akhir, department_id, description, grandtotal, is_mandatory ? 1 : 0, target_sales_id, target_sales_amount, total_percentage, id]
        );

        // 4. Update Details (Delete and Recreate)
        await connection.execute('DELETE FROM budget_details WHERE master_budget_id = ?', [id]);
        if (items && Array.isArray(items)) {
            for (let item of items) {
                await connection.execute(
                    'INSERT INTO budget_details (master_budget_id, category_id, category_name, budget, percentage, used_amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, NOW(), NOW())',
                    [id, item.category_id, item.category_name, item.budget, item.percentage]
                );
            }
        }

        await connection.commit();
        return res.json({ message: 'Budget updated successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Master Budget Update Error:', error);
        res.status(500).json({ message: 'Update failed: ' + error.message });
    } finally {
        connection.release();
    }
};

exports.deleteMasterBudget = async (req, res) => {
    const { id } = req.params;
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        // 1. Delete Details
        await connection.execute('DELETE FROM budget_details WHERE master_budget_id = ?', [id]);

        // 2. Delete Approval Request & logs
        const [approvals] = await connection.execute('SELECT id FROM approval_requests WHERE requestable_id = ? AND requestable_type LIKE "%MasterBudget"', [id]);
        for (const app of approvals) {
            await connection.execute('DELETE FROM approval_request_logs WHERE approval_request_id = ?', [app.id]);
            await connection.execute('DELETE FROM approval_requests WHERE id = ?', [app.id]);
        }

        // 3. Delete Master
        const [result] = await connection.execute('DELETE FROM master_budget WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Master budget not found' });
        }

        await connection.commit();
        return res.json({ message: 'Budget deleted successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Master Budget Delete Error:', error);
        res.status(500).json({ message: 'Delete failed: ' + error.message });
    } finally {
        connection.release();
    }
};

exports.syncMasterBudgetWithTargetSales = async (req, res) => {
    const { id } = req.params;
    const { type } = req.body; // 'percentage' (update nominal) or 'nominal' (update percentage)

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        // 1. Fetch current budget and target sales
        const [budgets] = await connection.execute(`
            SELECT mb.*, ts.target_amount as current_target_amount
            FROM master_budget mb
            JOIN target_sales ts ON mb.target_sales_id = ts.id
            WHERE mb.id = ?
        `, [id]);

        if (budgets.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Master budget not found or not linked to target sales.' });
        }

        const mb = budgets[0];
        const newTarget = parseFloat(mb.current_target_amount);
        
        if (type === 'percentage') {
            // Update Nominal based on existing Percentage
            const newGrandTotal = Math.round(newTarget * (parseFloat(mb.total_percentage) / 100));
            
            // Update Master
            let status = mb.status;
            if (status.toLowerCase() === 'approved') {
                status = 'Pending'; // Re-approval required if nominal changes
            }

            await connection.execute(
                'UPDATE master_budget SET grandtotal = ?, target_sales_amount = ?, status = ?, updated_at = NOW() WHERE id = ?',
                [newGrandTotal, newTarget, status, id]
            );

            // Update Details
            const [details] = await connection.execute('SELECT * FROM budget_details WHERE master_budget_id = ?', [id]);
            for (let detail of details) {
                const newBudget = Math.round(newTarget * (parseFloat(detail.percentage) / 100));
                await connection.execute(
                    'UPDATE budget_details SET budget = ?, updated_at = NOW() WHERE id = ?',
                    [newBudget, detail.id]
                );
            }
        } else if (type === 'nominal') {
            // Update Percentage based on existing Nominal
            const newTotalPercentage = (parseFloat(mb.grandtotal) / newTarget) * 100;
            
            // Update Master
            await connection.execute(
                'UPDATE master_budget SET total_percentage = ?, target_sales_amount = ?, updated_at = NOW() WHERE id = ?',
                [newTotalPercentage, newTarget, id]
            );

            // Update Details
            const [details] = await connection.execute('SELECT * FROM budget_details WHERE master_budget_id = ?', [id]);
            for (let detail of details) {
                const newDetailPercentage = (parseFloat(detail.budget) / newTarget) * 100;
                await connection.execute(
                    'UPDATE budget_details SET percentage = ?, updated_at = NOW() WHERE id = ?',
                    [newDetailPercentage, detail.id]
                );
            }
        }

        await connection.commit();
        res.json({ message: 'Master budget synced with target sales successfully.' });
    } catch (error) {
        await connection.rollback();
        console.error('Master Budget Sync Error:', error);
        res.status(500).json({ message: 'Sync failed: ' + error.message });
    } finally {
        connection.release();
    }
};

exports.toggleActiveMasterBudget = async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;

    try {
        const [budgets] = await db.execute('SELECT id, is_active FROM master_budget WHERE id = ?', [id]);
        if (budgets.length === 0) {
            return res.status(404).json({ message: 'Master budget not found' });
        }

        const currentActive = (budgets[0].is_active !== null && budgets[0].is_active !== undefined) ? Number(budgets[0].is_active) : 1;
        let newActive;
        if (is_active !== undefined) {
            newActive = (is_active === 1 || is_active === true || is_active === '1' || is_active === 'true') ? 1 : 0;
        } else {
            newActive = currentActive === 1 ? 0 : 1;
        }

        await db.execute('UPDATE master_budget SET is_active = ?, updated_at = NOW() WHERE id = ?', [newActive, id]);

        return res.json({
            message: `Master budget berhasil ${newActive === 1 ? 'diaktifkan' : 'dinonaktifkan'}.`,
            is_active: newActive
        });
    } catch (error) {
        console.error('Toggle Active Master Budget Error:', error);
        return res.status(500).json({ message: 'Failed to update active status: ' + error.message });
    }
};

// 2. Target Sales
exports.getTargetSales = async (req, res) => {
    try {
        const { year, status } = req.query;
        let query = `
            SELECT ts.*, u.name as creator_name 
            FROM target_sales ts
            LEFT JOIN users u ON ts.created_by = u.id
        `;
        let params = [];
        let conditions = [];

        if (year) {
            conditions.push('ts.year = ?');
            params.push(year);
        }

        if (status) {
            conditions.push('LOWER(ts.status) = ?');
            params.push(status.toLowerCase());
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY ts.year DESC, ts.month DESC';
        const [rows] = await db.execute(query, params);

        // Fetch approval info for each target
        const targetsWithDetails = await Promise.all(rows.map(async (target) => {
            const [approvals] = await db.execute(
                'SELECT * FROM approval_requests WHERE requestable_id = ? AND (requestable_type LIKE "%TargetSale" OR requestable_type = "Target Sales") LIMIT 1', 
                [target.id]
            );
            
            let approvalRequest = null;
            if (approvals.length > 0) {
                approvalRequest = serialize(approvals[0]);
                const [logs] = await db.execute(`
                    SELECT al.*, u.name as user_name 
                    FROM approval_request_logs al
                    JOIN users u ON al.user_id = u.id
                    WHERE al.approval_request_id = ?
                `, [approvalRequest.id]);
                
                approvalRequest.logs = logs.map(l => ({
                    ...l,
                    user: { name: l.user_name }
                }));
            }

            return {
                ...target,
                creator: { name: target.creator_name || 'System' },
                approval_request: approvalRequest
            };
        }));

        return res.json({ data: serialize(targetsWithDetails) });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.createTargetSales = async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { month, year, description } = req.body;
        const userId = req.user?.id || req.body.user_id || 1;

        // 1. Clean format rupiah/amount
        const rawAmount = req.body.target_amount;
        const cleanAmount = typeof rawAmount === 'string' 
            ? parseFloat(rawAmount.replace(/[^0-9]/g, '')) 
            : parseFloat(rawAmount);

        if (isNaN(cleanAmount) || cleanAmount <= 0) {
            throw new Error('Target amount must be a positive number.');
        }

        // 2. Check Duplicate
        const [exists] = await connection.execute(
            'SELECT id FROM target_sales WHERE month = ? AND year = ?',
            [month, year]
        );
        if (exists.length > 0) {
            throw new Error('Target Sales untuk periode bulan & tahun ini sudah ada.');
        }

        // 3. Generate Reference (TRGT/EPU/YY/MM)
        const yy = year.toString().slice(-2);
        const mm = String(month).padStart(2, '0');
        const reference = `TRGT/EPU/${yy}/${mm}`;

        // 4. Insert
        const [result] = await connection.execute(
            'INSERT INTO target_sales (month, year, target_amount, description, reference, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
            [month, year, cleanAmount, description, reference, 'Pending', userId]
        );
        const targetId = result.insertId;

        // 5. Approval Integration
        const [types] = await connection.execute('SELECT id FROM approval_types WHERE approval_code = "Sales" LIMIT 1');
        if (types.length > 0) {
            await approvalService.createRequest(
                'Modules\\TargetSale\\Entities\\TargetSale', 
                targetId,
                types[0].id,
                cleanAmount,
                userId,
                connection
            );
        }

        await connection.commit();
        return res.status(201).json({ 
            message: 'Target sales created successfully and is awaiting approval.', 
            id: targetId.toString(),
            reference 
        });
    } catch (error) {
        await connection.rollback();
        res.status(422).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.updateTargetSales = async (req, res) => {
    const { id } = req.params;
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { month, year, description } = req.body;
        const userId = req.user?.id || req.body.user_id || 1;

        // 1. Check if exists and status
        const [targets] = await connection.execute('SELECT * FROM target_sales WHERE id = ?', [id]);
        if (targets.length === 0) throw new Error('Target sales not found');
        
        const target = targets[0];
        if (!['pending', 'approved'].includes(target.status.toLowerCase())) {
            throw new Error('Hanya Target Sales dengan status Pending atau Approved yang dapat diupdate.');
        }

        const oldStatus = target.status.toLowerCase();

        // 2. Clean amount
        const rawAmount = req.body.target_amount;
        const cleanAmount = typeof rawAmount === 'string' 
            ? parseFloat(rawAmount.replace(/[^0-9]/g, '')) 
            : parseFloat(rawAmount);

        // 3. Check Duplicate
        const [exists] = await connection.execute(
            'SELECT id FROM target_sales WHERE month = ? AND year = ? AND id != ?',
            [month, year, id]
        );
        if (exists.length > 0) {
            throw new Error('Target Sales untuk periode bulan & tahun ini sudah ada.');
        }

        // 4. Update
        await connection.execute(
            'UPDATE target_sales SET month = ?, year = ?, target_amount = ?, description = ?, status = "Pending", updated_at = NOW() WHERE id = ?',
            [month, year, cleanAmount, description, id]
        );

        // 5. Approval Integration
        const [approvalReqs] = await connection.execute(
            'SELECT * FROM approval_requests WHERE requestable_id = ? AND (requestable_type LIKE "%TargetSale" OR requestable_type = "Target Sales") LIMIT 1', 
            [id]
        );

        if (approvalReqs.length > 0) {
            await connection.execute('DELETE FROM approval_request_logs WHERE approval_request_id = ?', [approvalReqs[0].id]);
            await connection.execute('DELETE FROM approval_requests WHERE id = ?', [approvalReqs[0].id]);
        }
        
        const [types] = await connection.execute('SELECT id FROM approval_types WHERE approval_code = "Sales" LIMIT 1');
        if (types.length > 0) {
            await approvalService.createRequest(
                'Modules\\TargetSale\\Entities\\TargetSale',
                id,
                types[0].id,
                cleanAmount,
                userId,
                connection
            );
        }

        await connection.commit();
        return res.json({ message: 'Target sales updated successfully and approval has been reset.' });
    } catch (error) {
        await connection.rollback();
        res.status(422).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.deleteTargetSales = async (req, res) => {
    const { id } = req.params;
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const [approvals] = await connection.execute(
            'SELECT id FROM approval_requests WHERE requestable_id = ? AND (requestable_type LIKE "%TargetSale" OR requestable_type = "Target Sales")', 
            [id]
        );
        for (const app of approvals) {
            await connection.execute('DELETE FROM approval_request_logs WHERE approval_request_id = ?', [app.id]);
            await connection.execute('DELETE FROM approval_requests WHERE id = ?', [app.id]);
        }

        const [result] = await connection.execute('DELETE FROM target_sales WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            throw new Error('Target sales not found');
        }

        await connection.commit();
        return res.json({ message: 'Target sales deleted successfully' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

// 3. Budget Checking
exports.checkBudget = async (req, res) => {
    try {
        const { department_id, date, amount, exclude_purchase_id } = req.query;
        const result = await budgetService.checkBudget(department_id, date, Number(amount), exclude_purchase_id);
        return res.json(result);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.checkCategoryBudget = async (req, res) => {
    try {
        const { department_id, date, items } = req.body;
        const result = await budgetService.checkCategoryBudget(department_id, date, items);
        return res.json(result);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getAvailableBudgets = async (req, res) => {
    try {
        const { date, month: qMonth, year: qYear } = req.query;
        let month, year;

        if (qMonth && qYear) {
            month = Number(qMonth);
            year  = Number(qYear);
        } else if (date) {
            const d = new Date(date);
            month = d.getMonth() + 1;
            year  = d.getFullYear();
        } else {
            const now = new Date();
            month = now.getMonth() + 1;
            year  = now.getFullYear();
        }

        const db = require('../config/db');
        const [rows] = await db.execute(
            `SELECT mb.id, mb.no_budgeting, mb.department_id, mb.bulan,
                    mb.grandtotal, mb.used_amount, mb.is_mandatory,
                    mb.periode_awal, mb.periode_akhir,
                    (mb.grandtotal - mb.used_amount) as remaining,
                    COALESCE(d.department_name, 'Direksi') as department_name
             FROM master_budget mb
             LEFT JOIN departments d ON mb.department_id = d.id
             WHERE mb.bulan = ? AND YEAR(mb.periode_awal) = ? AND LOWER(mb.status) = 'approved'
             ORDER BY mb.is_mandatory ASC, mb.id DESC`,
            [month, year]
        );

        return res.json({ data: rows });
    } catch (error) { res.status(500).json({ message: error.message }); }
};


exports.getAvailableBorrowSources = async (req, res) => {
    try {
        const { date, department_id, month, year } = req.query;
        const result = await budgetService.getAvailableBorrowSources(date, department_id, month, year);
        return res.json({ sources: result });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getMasterBudgetSummary = async (req, res) => {
    try {
        const { year = new Date().getFullYear() } = req.query;
        const [budgets] = await db.execute(`
            SELECT mb.*, d.department_name
            FROM master_budget mb
            LEFT JOIN departments d ON mb.department_id = d.id
            WHERE YEAR(mb.tgl_penyusunan) = ? AND LOWER(mb.status) = "approved"
        `, [year]);

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
        const chartData = [];
        const depts = new Set();

        for (let m = 1; m <= 12; m++) {
            const row = { name: months[m - 1] };
            const monthlyBudgets = budgets.filter(b => b.bulan == m);
            
            monthlyBudgets.forEach(b => {
                const deptName = b.department_name || 'Direksi';
                row[deptName] = (row[deptName] || 0) + Number(b.grandtotal);
                depts.add(deptName);
            });
            chartData.push(row);
        }

        return res.json({
            chartData: serialize(chartData),
            departments: Array.from(depts)
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getTargetSalesSummary = async (req, res) => {
    try {
        const { year = new Date().getFullYear() } = req.query;
        const [targets] = await db.execute(`
            SELECT * FROM target_sales 
            WHERE year = ? AND LOWER(status) = "approved"
        `, [year]);

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
        const chartData = [];

        for (let m = 1; m <= 12; m++) {
            const monthlyTarget = targets.find(t => t.month == m);
            chartData.push({
                name: months[m - 1],
                Target: monthlyTarget ? Number(monthlyTarget.target_amount) : 0
            });
        }

        return res.json({
            chartData: serialize(chartData)
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getBudgetingFormData = async (req, res) => {
    try {
        const [departments] = await db.execute('SELECT id, department_name FROM departments');
        // Prepend Direksi if not present
        if (!departments.some(d => d.id === 0)) {
            departments.unshift({ id: 0, department_name: 'Direksi' });
        }

        const [categories] = await db.execute('SELECT * FROM categories');
        const [suppliers] = await db.execute('SELECT * FROM suppliers');

        let productsQuery = `
            SELECT p.*, c.category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id
        `;
        let productsParams = [];
        const userId = req.query.user_id || req.user?.id;

        if (userId) {
            // Check if Super Admin
            const [roles] = await db.execute(`
                SELECT r.name 
                FROM roles r 
                JOIN model_has_roles mhr ON r.id = mhr.role_id 
                WHERE mhr.model_id = ? AND mhr.model_type = "App\\\\Models\\\\User"
            `, [userId]);
            
            const isSuperAdmin = roles.some(r => r.name === 'Super Admin');

            if (!isSuperAdmin) {
                // Get user categories & products
                const [userCats] = await db.execute('SELECT category_id FROM user_categories WHERE user_id = ? AND category_id IS NOT NULL', [userId]);
                const [userProds] = await db.execute('SELECT product_id FROM user_categories WHERE user_id = ? AND product_id IS NOT NULL', [userId]);

                const catIds = userCats.map(c => c.category_id);
                const prodIds = userProds.map(p => p.product_id);

                if (catIds.length > 0 || prodIds.length > 0) {
                    let conditions = [];
                    if (catIds.length > 0) {
                        conditions.push('p.category_id IN (' + catIds.map(() => '?').join(',') + ')');
                        productsParams.push(...catIds);
                    }
                    if (prodIds.length > 0) {
                        conditions.push('p.id IN (' + prodIds.map(() => '?').join(',') + ')');
                        productsParams.push(...prodIds);
                    }
                    productsQuery += ' WHERE (' + conditions.join(' OR ') + ')';
                } else {
                    // Regular user with no assignments = see nothing
                    productsQuery += ' WHERE 1=0';
                }
            }
        }

        const [productRows] = await db.execute(productsQuery, productsParams);
        const products = productRows.map(p => ({
            ...p,
            category: {
                id: p.category_id,
                category_name: p.category_name
            }
        }));

        const [ppns] = await db.execute('SELECT * FROM ppns');
        const [pphs] = await db.execute('SELECT * FROM pphs');
        const [currencies] = await db.execute('SELECT * FROM currencies');

        return res.json(serialize({
            departments,
            categories,
            suppliers,
            products,
            ppns,
            pphs,
            currencies
        }));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};
