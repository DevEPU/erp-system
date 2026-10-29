const db = require('../config/db');

// Utility function for BigInt serialization
const serialize = (data) => JSON.parse(JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
));

exports.totalBudgetPurchase = async (req, res) => {
    try {
        const month = req.query.month || new Date().getMonth() + 1;
        const year = req.query.year || new Date().getFullYear();

        const [[{ approved_budget }]] = await db.execute(`
            SELECT SUM(grandtotal) as approved_budget 
            FROM master_budget 
            WHERE LOWER(status) = "approved" 
            AND MONTH(periode_awal) = ? 
            AND YEAR(periode_awal) = ?
        `, [month, year]);

        const [[{ purchases }]] = await db.execute(`
            SELECT SUM(pd.sub_total) as purchases 
            FROM purchase_details pd
            JOIN purchases p ON pd.purchase_id = p.id
            WHERE LOWER(p.status) = "approved" 
            AND MONTH(p.date) = ? 
            AND YEAR(p.date) = ?
            AND pd.is_asset = 0
        `, [month, year]);

        const [[{ total_assets }]] = await db.execute(`
            SELECT SUM(pd.sub_total) as total_assets 
            FROM purchase_details pd
            JOIN purchases p ON pd.purchase_id = p.id
            WHERE LOWER(p.status) = "approved" 
            AND MONTH(p.date) = ? 
            AND YEAR(p.date) = ?
            AND pd.is_asset = 1
        `, [month, year]);

        const [[{ pending_purchases }]] = await db.execute(`
            SELECT SUM(total_amount) as pending_purchases 
            FROM purchases 
            WHERE LOWER(status) = "pending" 
            AND MONTH(date) = ? 
            AND YEAR(date) = ?
        `, [month, year]);

        const remaining_budget = (parseFloat(approved_budget) || 0) - (parseFloat(purchases) || 0);

        return res.json(serialize({
            approved_budget: approved_budget || 0,
            purchases: purchases || 0,
            remaining_budget: remaining_budget,
            total_assets: total_assets || 0,
            pending_purchases: pending_purchases || 0,
            currency: 'IDR'
        }));
    } catch (error) { 
        console.error(error);
        res.status(500).json({ message: error.message }); 
    }
};

exports.targetVsPurchaseChart = async (req, res) => {
    try {
        const year = req.query.year || new Date().getFullYear();
        
        const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const targetAmounts = [];
        const limit065s = [];
        const mandatoryPurchases = [];
        const othersPurchases = [];
        const assetPurchases = [];

        for (let month = 1; month <= 12; month++) {
            const [[{ targetAmount }]] = await db.execute(`
                SELECT SUM(target_amount) as targetAmount 
                FROM target_sales 
                WHERE year = ? AND month = ? AND LOWER(status) = "approved"
            `, [year, month]);

            const [details] = await db.execute(`
                SELECT pd.*, pr.product_name, pr.is_mandatory
                FROM purchase_details pd
                JOIN purchases p_ref ON pd.purchase_id = p_ref.id
                LEFT JOIN products pr ON pd.product_id = pr.id
                WHERE LOWER(p_ref.status) = "approved"
                AND YEAR(p_ref.date) = ?
                AND MONTH(p_ref.date) = ?
            `, [year, month]);

            const tAmt = parseFloat(targetAmount) || 0;
            targetAmounts.push(tAmt);
            limit065s.push(tAmt * 0.0065);

            let mntAmt = 0, othAmt = 0, astAmt = 0;
            details.forEach(d => {
                const sub = parseFloat(d.sub_total) || 0;
                if (d.is_asset) {
                    astAmt += sub;
                } else if (d.is_mandatory) {
                    mntAmt += sub;
                } else {
                    othAmt += sub;
                }
            });

            mandatoryPurchases.push(mntAmt);
            othersPurchases.push(othAmt);
            assetPurchases.push(astAmt);
        }

        return res.json(serialize({
            labels,
            targetAmounts,
            limit065s,
            mandatoryPurchases,
            othersPurchases,
            assetPurchases
        }));
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.budgetPurchasesChart = async (req, res) => {
    try {
        const month = req.query.month || new Date().getMonth() + 1;
        const year = req.query.year || new Date().getFullYear();
        const department_id = req.query.department_id !== 'null' ? req.query.department_id : null;

        const daysInMonth = new Date(year, month, 0).getDate();
        const labels = Array.from({length: daysInMonth}, (_, i) => i + 1);
        const approvedBudgets = [];
        const approvedNonAssetPurchases = [];
        const approvedAssetPurchases = [];

        // Total approved budget for this period
        let budgetQuery = 'SELECT SUM(grandtotal) as total FROM master_budget WHERE LOWER(status) = "approved" AND MONTH(periode_awal) = ? AND YEAR(periode_awal) = ?';
        let budgetParams = [month, year];
        if (department_id) {
            budgetQuery += ' AND department_id = ?';
            budgetParams.push(department_id);
        }
        const [[{ total: totalBudget }]] = await db.execute(budgetQuery, budgetParams);

        let cumulativeNonAsset = 0;
        let cumulativeAsset = 0;

        for (let day = 1; day <= daysInMonth; day++) {
            const baseCond = `
                JOIN purchases p ON pd.purchase_id = p.id
                LEFT JOIN products pr ON pd.product_id = pr.id
                WHERE LOWER(p.status) = "approved"
                AND MONTH(p.date) = ? AND YEAR(p.date) = ? AND DAY(p.date) = ?
            `;
            const dayParams = [month, year, day];

            // ASSET: pd.is_asset=1 OR (pd.is_asset is null/0 tapi product.is_asset=1)
            let assetQuery = `
                SELECT SUM(pd.sub_total) as daily_asset
                FROM purchase_details pd
                ${baseCond}
                AND (pd.is_asset = 1 OR pr.is_asset = 1)
            `;
            let assetParams = [...dayParams];
            if (department_id) { assetQuery += ' AND p.department_id = ?'; assetParams.push(department_id); }
            const [[{ daily_asset }]] = await db.execute(assetQuery, assetParams);

            // NON-ASSET: keduanya bukan asset
            let nonAssetQuery = `
                SELECT SUM(pd.sub_total) as daily_non_asset
                FROM purchase_details pd
                ${baseCond}
                AND (pd.is_asset = 0 OR pd.is_asset IS NULL)
                AND (pr.is_asset = 0 OR pr.is_asset IS NULL)
            `;
            let nonAssetParams = [...dayParams];
            if (department_id) { nonAssetQuery += ' AND p.department_id = ?'; nonAssetParams.push(department_id); }
            const [[{ daily_non_asset }]] = await db.execute(nonAssetQuery, nonAssetParams);

            cumulativeNonAsset += parseFloat(daily_non_asset) || 0;
            cumulativeAsset    += parseFloat(daily_asset) || 0;

            approvedNonAssetPurchases.push(cumulativeNonAsset);
            approvedAssetPurchases.push(cumulativeAsset);
            // Sisa budget hanya dikurangi pembelian non-asset
            approvedBudgets.push(Math.max((parseFloat(totalBudget) || 0) - cumulativeNonAsset, 0));
        }

        return res.json(serialize({
            labels,
            approvedBudgets,
            approvedPurchases: approvedNonAssetPurchases,
            approvedNonAssetPurchases,
            approvedAssetPurchases
        }));
    } catch (error) { res.status(500).json({ message: error.message }); }
};



exports.budgetByDepartmentChart = async (req, res) => {
    try {
        const month = req.query.month || new Date().getMonth() + 1;
        const year = req.query.year || new Date().getFullYear();

        const [rows] = await db.execute(`
            SELECT d.department_name as name, SUM(mb.grandtotal) as value 
            FROM master_budget mb 
            JOIN departments d ON mb.department_id = d.id 
            WHERE mb.status = "approved" 
            AND MONTH(mb.periode_awal) = ?
            AND YEAR(mb.periode_awal) = ?
            GROUP BY d.id, d.department_name
        `, [month, year]);
        
        return res.json(serialize({
            labels: rows.map(r => r.name),
            data: rows.map(r => r.value)
        }));
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.budgetByCategoryChart = async (req, res) => {
    try {
        const month = req.query.month || new Date().getMonth() + 1;
        const year = req.query.year || new Date().getFullYear();
        const department_id = req.query.department_id !== 'null' ? req.query.department_id : null;

        let query = `
            SELECT bd.category_name as name, SUM(bd.budget) as value 
            FROM budget_details bd 
            JOIN master_budget mb ON bd.master_budget_id = mb.id 
            WHERE mb.status = "approved" 
            AND MONTH(mb.periode_awal) = ?
            AND YEAR(mb.periode_awal) = ?
        `;
        let params = [month, year];

        if (department_id) {
            query += ' AND mb.department_id = ?';
            params.push(department_id);
        }

        query += ' GROUP BY bd.category_id, bd.category_name';
        const [rows] = await db.execute(query, params);

        return res.json(serialize({
            labels: rows.map(r => r.name),
            data: rows.map(r => r.value)
        }));
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.pendingPurchasesList = async (req, res) => {
    try {
        const department_id = req.query.department_id !== 'null' ? req.query.department_id : null;
        
        // 1. Fetch base purchases
        let query = `
            SELECT p.*, d.department_name, d.department_code, u.name as user_name 
            FROM purchases p 
            LEFT JOIN departments d ON p.department_id = d.id 
            LEFT JOIN users u ON p.users_id = u.id 
            WHERE p.status = 'pending'
        `;
        let params = [];

        if (department_id) {
            query += ' AND p.department_id = ?';
            params.push(department_id);
        }

        query += ' ORDER BY p.date DESC LIMIT 10';
        const [rows] = await db.execute(query, params);

        if (rows.length === 0) return res.json([]);

        // 2. Fetch Details, Master Budget & Allocations for each purchase
        const enrichedRows = await Promise.all(rows.map(async (p) => {
            // Get Purchase Details
            const [details] = await db.execute(`
                SELECT pd.*, pr.product_name, pr.product_code, pr.product_unit, pr.is_asset, pr.is_mandatory
                FROM purchase_details pd
                LEFT JOIN products pr ON pd.product_id = pr.id
                WHERE pd.purchase_id = ?
            `, [p.id]);

            // Get Master Budget Info
            let masterBudget = null;
            if (p.source_master_budget_id) {
                const [mbRows] = await db.execute(`
                    SELECT mb.*, d.department_name, d.department_code
                    FROM master_budget mb
                    LEFT JOIN departments d ON mb.department_id = d.id
                    WHERE mb.id = ?
                `, [p.source_master_budget_id]);
                if (mbRows.length > 0) {
                    masterBudget = {
                        ...mbRows[0],
                        department: {
                            id: mbRows[0].department_id,
                            department_name: mbRows[0].department_name,
                            department_code: mbRows[0].department_code
                        }
                    };
                }
            }

            // Get Allocations (Borrowing)
            const [allocations] = await db.execute(`
                SELECT pa.*, mb.no_budgeting as master_reference, bd.category_name as source_category_name
                FROM purchase_budget_allocations pa
                LEFT JOIN master_budget mb ON pa.source_master_budget_id = mb.id
                LEFT JOIN budget_details bd ON pa.source_budget_detail_id = bd.id
                WHERE pa.purchase_id = ?
            `, [p.id]);

            return {
                ...p,
                department: {
                    id: p.department_id,
                    department_name: p.department_name,
                    department_code: p.department_code
                },
                user: {
                    id: p.users_id,
                    name: p.user_name
                },
                purchase_details: details,
                master_budget: masterBudget,
                allocations: allocations
            };
        }));

        return res.json(serialize(enrichedRows));
    } catch (error) { 
        console.error('pendingPurchasesList Error:', error);
        res.status(500).json({ message: error.message }); 
    }
};

exports.supplierProcurementStats = async (req, res) => {
    try {
        const [[{ active_suppliers }]] = await db.execute(`SELECT COUNT(*) as active_suppliers FROM suppliers WHERE is_active = 1`);
        const [[{ active_pos }]] = await db.execute(`SELECT COUNT(*) as active_pos FROM purchase_orders WHERE is_closed = 0 AND LOWER(status) != 'cancelled'`);
        const [[{ todays_receipts }]] = await db.execute(`SELECT COUNT(*) as todays_receipts FROM goods_receipts WHERE DATE(date) = CURDATE()`);
        const [[{ pending_invoices }]] = await db.execute(`SELECT COUNT(*) as pending_invoices FROM purchase_invoices WHERE LOWER(status) = 'unpaid' OR LOWER(status) = 'pending'`);
        const [[{ pending_prs }]] = await db.execute(`SELECT COUNT(*) as pending_prs FROM purchases WHERE LOWER(status) = 'pending'`);
        const [[{ total_hutang }]] = await db.execute(`SELECT COALESCE(SUM(due_amount), 0) as total_hutang FROM purchase_invoices WHERE LOWER(status) = 'unpaid' OR LOWER(status) = 'pending'`);
        const [[{ active_returns }]] = await db.execute(`SELECT COUNT(*) as active_returns FROM purchase_returns WHERE LOWER(status) = 'pending' OR status IS NULL OR status = ''`);
        const [[{ monthly_spend }]] = await db.execute(`SELECT COALESCE(SUM(total_amount), 0) as monthly_spend FROM purchase_invoices WHERE MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE())`);

        return res.json(serialize({
            active_suppliers,
            active_pos,
            todays_receipts,
            pending_invoices,
            pending_prs,
            total_hutang,
            active_returns,
            monthly_spend
        }));
    } catch (error) { 
        console.error('supplierProcurementStats Error:', error);
        res.status(500).json({ message: error.message }); 
    }
};

exports.inventoryStats = async (req, res) => {
    try {
        const [[{ total_products }]] = await db.execute(`
            SELECT 
                (SELECT COUNT(*) FROM product_suppliers) + 
                (SELECT COUNT(*) FROM products p WHERE NOT EXISTS (SELECT 1 FROM product_suppliers ps WHERE ps.product_id = p.id)) 
                AS total_products
        `);
        const [[{ total_categories }]] = await db.execute(`SELECT COUNT(*) as total_categories FROM categories`);
        const [[{ total_warehouses }]] = await db.execute(`SELECT COUNT(*) as total_warehouses FROM warehouses WHERE is_active = 1`);
        const [[{ low_stock }]] = await db.execute(`SELECT COUNT(*) as low_stock FROM product_locations WHERE stock <= min_qty AND min_qty > 0`);
        const [[{ stock_in_today }]] = await db.execute(`SELECT COUNT(*) as stock_in_today FROM goods_receipts WHERE DATE(date) = CURDATE()`);
        const [[{ stock_out_today }]] = await db.execute(`SELECT COUNT(*) as stock_out_today FROM sales WHERE DATE(date) = CURDATE()`);
        const [[{ adjustments_this_month }]] = await db.execute(`SELECT COUNT(*) as adjustments_this_month FROM adjustments WHERE MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE())`);
        const [[{ total_stock_value }]] = await db.execute(`
            SELECT COALESCE(SUM(p.product_price * pl.stock), 0) as total_stock_value 
            FROM product_locations pl 
            JOIN products p ON pl.product_id = p.id
        `);

        return res.json(serialize({
            total_products,
            total_categories,
            total_warehouses,
            low_stock,
            stock_in_today,
            stock_out_today,
            adjustments_this_month,
            total_stock_value
        }));
    } catch (error) { 
        console.error('inventoryStats Error:', error);
        res.status(500).json({ message: error.message }); 
    }
};

exports.salesStats = async (req, res) => {
    try {
        const [[{ total_customers }]] = await db.execute(`SELECT COUNT(*) as total_customers FROM customers`);
        const [[{ active_quotations }]] = await db.execute(`SELECT COUNT(*) as active_quotations FROM customer_forecasts`);
        const [[{ total_sales_today }]] = await db.execute(`SELECT COUNT(*) as total_sales_today FROM sales WHERE DATE(date) = CURDATE()`);
        const [[{ unpaid_invoices }]] = await db.execute(`SELECT COUNT(*) as unpaid_invoices FROM sales WHERE LOWER(payment_status) = 'unpaid' OR LOWER(payment_status) = 'partial'`);
        const [[{ total_piutang }]] = await db.execute(`SELECT COALESCE(SUM(due_amount), 0) as total_piutang FROM sales WHERE LOWER(payment_status) = 'unpaid' OR LOWER(payment_status) = 'partial'`);
        const [[{ monthly_revenue }]] = await db.execute(`SELECT COALESCE(SUM(total_amount), 0) as monthly_revenue FROM sales WHERE MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE()) AND LOWER(status) != 'cancelled'`);
        const [[{ monthly_target }]] = await db.execute(`SELECT COALESCE(SUM(target_amount), 0) as monthly_target FROM target_sales WHERE month = MONTH(CURDATE()) AND year = YEAR(CURDATE()) AND LOWER(status) = 'approved'`);
        const [[{ active_returns }]] = await db.execute(`SELECT COUNT(*) as active_returns FROM sale_returns WHERE LOWER(status) = 'pending' OR status IS NULL OR status = ''`);

        return res.json(serialize({
            total_customers,
            active_quotations,
            total_sales_today,
            unpaid_invoices,
            total_piutang,
            monthly_revenue,
            monthly_target,
            active_returns
        }));
    } catch (error) { 
        console.error('salesStats Error:', error);
        res.status(500).json({ message: error.message }); 
    }
};

exports.manufacturingStats = async (req, res) => {
    try {
        // Total products in system
        const [[{ total_products }]] = await db.execute(`SELECT COUNT(*) as total_products FROM products`);
        // Products tagged as Raw Material
        const [[{ raw_materials }]] = await db.execute(`SELECT COUNT(*) as raw_materials FROM products WHERE product_type = 'Raw Material'`);
        // Products with a BOM code
        const [[{ bom_products }]] = await db.execute(`SELECT COUNT(*) as bom_products FROM products WHERE bom_code IS NOT NULL AND bom_code != ''`);
        // Active (open) purchase orders for raw material procurement
        const [[{ open_pos }]] = await db.execute(`SELECT COUNT(*) as open_pos FROM purchase_orders WHERE is_closed = 0 AND LOWER(status) != 'cancelled'`);
        // Goods receipts this month (inbound raw materials)
        const [[{ gr_this_month }]] = await db.execute(`SELECT COUNT(*) as gr_this_month FROM goods_receipts WHERE MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE())`);
        // Low stock raw materials
        const [[{ low_stock_materials }]] = await db.execute(`
            SELECT COUNT(*) as low_stock_materials 
            FROM product_locations pl 
            JOIN products p ON pl.product_id = p.id 
            WHERE pl.stock <= pl.min_qty AND pl.min_qty > 0
        `);
        // Material spend this month (approved POs)
        const [[{ material_spend }]] = await db.execute(`SELECT COALESCE(SUM(total_amount), 0) as material_spend FROM purchase_orders WHERE MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE()) AND LOWER(status) = 'approved'`);
        // Total active suppliers (vendors / material suppliers)
        const [[{ active_suppliers }]] = await db.execute(`SELECT COUNT(*) as active_suppliers FROM suppliers WHERE is_active = 1`);

        return res.json(serialize({
            total_products,
            raw_materials,
            bom_products,
            open_pos,
            gr_this_month,
            low_stock_materials,
            material_spend,
            active_suppliers
        }));
    } catch (error) { 
        console.error('manufacturingStats Error:', error);
        res.status(500).json({ message: error.message }); 
    }
};
