const db = require('../config/db');

// Utility function for BigInt serialization
const serialize = (data) => JSON.parse(JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
));

exports.getBudgetSummary = async (req, res) => {
    try {
        let { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;
        year = parseInt(year);
        month = parseInt(month);

        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        // 1. Get Departments
        const [departments] = await db.execute('SELECT * FROM departments');

        const summary = [];

        for (let dept of departments) {
            // 2. Get Approved Master Budgets for this dept/period
            // Case-insensitive status check and robust date matching
            const [masterBudgets] = await db.execute(
                'SELECT * FROM master_budget WHERE department_id = ? AND bulan = ? AND YEAR(periode_awal) = ? AND TRIM(LOWER(status)) = "approved"',
                [dept.id, month, year]
            );

            // 3. Get Details for these budgets
            let budgetIds = masterBudgets.map(mb => mb.id);
            let detailsMap = [];
            if (budgetIds.length > 0) {
                const [details] = await db.query('SELECT * FROM budget_details WHERE master_budget_id IN (?)', [budgetIds]);
                detailsMap = details;
            }

            // 4. Get Over Budget (Borrowing)
            const [overBudgetItems] = await db.execute(`
                SELECT pba.*, mb.department_id as source_dept_id, d.department_name as source_dept_name, bd.category_name as source_cat_name, c.category_name as target_cat_name
                FROM purchase_budget_allocations pba
                JOIN purchases p ON pba.purchase_id = p.id
                LEFT JOIN master_budget mb ON pba.source_master_budget_id = mb.id
                LEFT JOIN departments d ON mb.department_id = d.id
                LEFT JOIN budget_details bd ON pba.source_budget_detail_id = bd.id
                LEFT JOIN categories c ON pba.target_category_id = c.id
                WHERE p.department_id = ? AND MONTH(p.date) = ? AND YEAR(p.date) = ? AND LOWER(p.status) = "approved"
                AND (pba.is_borrowed_internal = 1 OR pba.is_borrowed_external = 1)
            `, [dept.id, month, year]);

            // 5. Get Lent (Dipinjam)
            const [lentItems] = await db.execute(`
                SELECT pba.*, p.department_id as target_dept_id, d.department_name as target_dept_name, bd.category_name as source_cat_name, c.category_name as target_cat_name
                FROM purchase_budget_allocations pba
                JOIN purchases p ON pba.purchase_id = p.id
                JOIN master_budget mb ON pba.source_master_budget_id = mb.id
                LEFT JOIN departments d ON p.department_id = d.id
                LEFT JOIN budget_details bd ON pba.source_budget_detail_id = bd.id
                LEFT JOIN categories c ON pba.target_category_id = c.id
                WHERE mb.department_id = ? AND mb.bulan = ? AND YEAR(mb.periode_awal) = ? AND LOWER(p.status) = "approved"
                AND (pba.is_borrowed_internal = 1 OR pba.is_borrowed_external = 1)
            `, [dept.id, month, year]);

            let totalGT = 0, totalUsed = 0;
            let mandatoryGT = 0, mandatoryUsed = 0;
            let othersGT = 0, othersUsed = 0;
            let budgets = [];

            for (let mb of masterBudgets) {
                totalGT += Number(mb.grandtotal);
                totalUsed += Number(mb.used_amount);
                if (mb.is_mandatory) {
                    mandatoryGT += Number(mb.grandtotal);
                    mandatoryUsed += Number(mb.used_amount);
                } else {
                    othersGT += Number(mb.grandtotal);
                    othersUsed += Number(mb.used_amount);
                }

                budgets.push({
                    id: mb.id,
                    no_budgeting: mb.no_budgeting,
                    is_mandatory: Boolean(mb.is_mandatory),
                    grandtotal: Number(mb.grandtotal),
                    used_amount: Number(mb.used_amount),
                    remaining: Number(mb.grandtotal) - Number(mb.used_amount),
                    details: detailsMap.filter(d => d.master_budget_id === mb.id).map(d => ({
                        category_name: d.category_name,
                        budget: Number(d.budget),
                        used_amount: Number(d.used_amount),
                        remaining: Number(d.budget) - Number(d.used_amount)
                    }))
                });
            }

            summary.push({
                department_id: dept.id,
                department_name: dept.department_name,
                grandtotal: totalGT,
                used_amount: totalUsed,
                remaining: totalGT - totalUsed,
                mandatory_grandtotal: mandatoryGT,
                mandatory_used: mandatoryUsed,
                mandatory_remaining: mandatoryGT - mandatoryUsed,
                others_grandtotal: othersGT,
                others_used: othersUsed,
                others_remaining: othersGT - othersUsed,
                over_budget_internal: overBudgetItems.filter(i => i.is_borrowed_internal === 1).reduce((sum, i) => sum + Number(i.amount), 0),
                over_budget_external: overBudgetItems.filter(i => i.is_borrowed_external === 1).reduce((sum, i) => sum + Number(i.amount), 0),
                over_budget_total: overBudgetItems.reduce((sum, i) => sum + Number(i.amount), 0),
                lent_internal: lentItems.filter(i => i.is_borrowed_internal === 1).reduce((sum, i) => sum + Number(i.amount), 0),
                lent_external: lentItems.filter(i => i.is_borrowed_external === 1).reduce((sum, i) => sum + Number(i.amount), 0),
                lent_total: lentItems.reduce((sum, i) => sum + Number(i.amount), 0),
                over_budget_details: overBudgetItems.map(i => ({
                    amount: Number(i.amount),
                    is_internal: Boolean(i.is_borrowed_internal),
                    source: i.is_borrowed_internal ? (i.source_cat_name || 'Internal') : (i.source_dept_name || 'Other Dept'),
                    target_category: i.target_cat_name || 'GA',
                    source_category: i.source_cat_name || 'GA'
                })),
                lent_details: lentItems.map(i => ({
                    amount: Number(i.amount),
                    is_internal: Boolean(i.is_borrowed_internal),
                    target: i.is_borrowed_internal ? (i.target_cat_name || 'Internal') : (i.target_dept_name || 'Other Dept'),
                    target_category: i.target_cat_name || 'GA',
                    source_category: i.source_cat_name || 'All Category / Others'
                })),
                budgets
            });
        }

        return res.json({ data: summary });
    } catch (error) { 
        console.error('Budget Summary Error:', error);
        res.status(500).json({ message: error.message }); 
    }
};

exports.getPurchaseReport = async (req, res) => {
    try {
        const { start_date, end_date, department_id, status } = req.query;
        let query = `
            SELECT p.*, d.department_name
            FROM purchases p
            LEFT JOIN departments d ON p.department_id = d.id
        `;
        let params = [];
        let conditions = [];

        if (start_date) { conditions.push('p.date >= ?'); params.push(start_date); }
        if (end_date) { conditions.push('p.date <= ?'); params.push(end_date); }
        if (department_id) { conditions.push('p.department_id = ?'); params.push(department_id); }
        if (status) { conditions.push('p.status = ?'); params.push(status); }

        if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
        query += ' ORDER BY p.date DESC';

        const [rows] = await db.execute(query, params);

        // Stats calculation
        const stats = {
            total_count: rows.length,
            total_amount: rows.reduce((s, r) => s + Number(r.total_amount), 0),
            total_asset_amount: rows.reduce((s, r) => s + Number(r.asset_amount || 0), 0),
            by_status: {},
            by_department: {}
        };

        rows.forEach(r => {
            const sName = r.status.toLowerCase();
            if (!stats.by_status[sName]) stats.by_status[sName] = { count: 0, amount: 0 };
            stats.by_status[sName].count++;
            stats.by_status[sName].amount += Number(r.total_amount);

            const dName = r.department_name || 'Unknown';
            if (!stats.by_department[dName]) stats.by_department[dName] = { count: 0, amount: 0 };
            stats.by_department[dName].count++;
            stats.by_department[dName].amount += Number(r.total_amount);
        });

        return res.json({ data: serialize(rows), stats });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getMasterBudgetReport = async (req, res) => {
    try {
        const { start_date, end_date, department_id, status } = req.query;
        let query = `
            SELECT mb.*, d.department_name
            FROM master_budget mb
            LEFT JOIN departments d ON mb.department_id = d.id
        `;
        let params = [];
        let conditions = [];

        if (start_date) { conditions.push('mb.periode_akhir >= ?'); params.push(start_date); }
        if (end_date) { conditions.push('mb.periode_awal <= ?'); params.push(end_date); }
        if (department_id) { conditions.push('mb.department_id = ?'); params.push(department_id); }
        if (status) { conditions.push('mb.status = ?'); params.push(status); }

        if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
        query += ' ORDER BY mb.periode_awal DESC';

        const [rows] = await db.execute(query, params);

        const stats = {
            total_count: rows.length,
            total_budget: rows.reduce((s, r) => s + Number(r.grandtotal), 0),
            total_used: rows.reduce((s, r) => s + Number(r.used_amount), 0),
            total_reserved: rows.reduce((s, r) => s + Number(r.reserved_amount || 0), 0),
            total_remaining: rows.reduce((s, r) => s + (Number(r.grandtotal) - Number(r.used_amount) - Number(r.reserved_amount || 0)), 0),
            by_status: {},
            by_department: {}
        };

        rows.forEach(r => {
            const sName = r.status.toLowerCase();
            if (!stats.by_status[sName]) stats.by_status[sName] = { count: 0, total_budget: 0, total_used: 0 };
            stats.by_status[sName].count++;
            stats.by_status[sName].total_budget += Number(r.grandtotal);
            stats.by_status[sName].total_used += Number(r.used_amount);

            const dName = r.department_name || 'Unknown';
            if (!stats.by_department[dName]) stats.by_department[dName] = { count: 0, total_budget: 0, total_used: 0 };
            stats.by_department[dName].count++;
            stats.by_department[dName].total_budget += Number(r.grandtotal);
            stats.by_department[dName].total_used += Number(r.used_amount);
        });

        return res.json({ data: serialize(rows), stats });
    } catch (error) { res.status(500).json({ message: error.message }); }
};
