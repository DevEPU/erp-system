const db = require('../config/db');

class BudgetService {
    /**
     * Check overall budget sufficiency for a department & period.
     * Mirrors Laravel GET /budgeting/check-budget
     */
    async checkBudget(departmentId, date, amount, excludePurchaseId = null) {
        const purchaseDate = new Date(date);
        const month = purchaseDate.getMonth() + 1;
        const year  = purchaseDate.getFullYear();

        const [budgets] = await db.execute(
            `SELECT * FROM master_budget 
             WHERE department_id = ? AND bulan = ? AND YEAR(periode_awal) = ? AND LOWER(status) = 'approved' AND (is_active = 1 OR is_active IS NULL)
             ORDER BY id DESC LIMIT 1`,
            [departmentId, month, year]
        );

        if (budgets.length === 0) {
            return {
                sufficient: false,
                message: 'Budget tidak ditemukan untuk departemen ini pada periode tersebut.',
                remaining: 0
            };
        }

        const budget = budgets[0];

        // Pending purchases linked to this budget
        let query = `SELECT id, borrowed_amount FROM purchases 
                     WHERE master_budget_id = ? AND LOWER(status) IN ('pending','menunggu')`;
        const params = [budget.id];
        if (excludePurchaseId) { query += ' AND id != ?'; params.push(excludePurchaseId); }
        const [pendingPurchases] = await db.execute(query, params);

        if (pendingPurchases.length === 0) {
            const remaining = Number(budget.grandtotal) - Number(budget.used_amount);
            return { sufficient: remaining >= amount, remaining, budget_id: budget.id };
        }

        const pendingIds = pendingPurchases.map(p => p.id);
        const ph = pendingIds.map(() => '?').join(',');

        // Sum NON-ASSET details (reserved)
        const [reservedRows] = await db.execute(
            `SELECT COALESCE(SUM(sub_total), 0) as total FROM purchase_details 
             WHERE purchase_id IN (${ph}) AND (is_asset = 0 OR is_asset IS NULL)`,
            pendingIds
        );
        const reservedDetails = Number(reservedRows[0].total || 0);
        const totalBorrowed   = pendingPurchases.reduce((s, p) => s + Number(p.borrowed_amount || 0), 0);

        // reserved = non-asset subtotals minus borrowed amounts (borrowed come from other budget)
        const reserved  = reservedDetails - totalBorrowed;
        const remaining = Number(budget.grandtotal) - Number(budget.used_amount) - reserved;

        return {
            sufficient: remaining >= amount,
            remaining,
            budget_id: budget.id,
            department_name: budget.department_name || null
        };
    }

    /**
     * Per-category budget check — mirrors Laravel purchase creation logic.
     * items: [{ category_id, sum_amount, is_mandatory?, category_name? }]
     * Returns detailed over-budget per category per budget type.
     */
    async checkCategoryBudget(departmentId, date, items) {
        // If no non-asset items, skip budget check entirely
        if (!items || items.length === 0) {
            return { is_over_budget: false, over_budget_details: [], total_shortfall: 0 };
        }

        const d     = new Date(date);
        const month = d.getMonth() + 1;
        const year  = d.getFullYear();

        // Fetch all approved budgets for this dept & period (mandatory + others)
        const [budgets] = await db.execute(
            `SELECT mb.*, GROUP_CONCAT(bd.id, ':', bd.category_id, ':', bd.budget, ':', bd.used_amount SEPARATOR '|') as details_raw
             FROM master_budget mb
             LEFT JOIN budget_details bd ON bd.master_budget_id = mb.id
             WHERE mb.department_id = ? AND mb.bulan = ? AND YEAR(mb.periode_awal) = ? AND LOWER(mb.status) = 'approved' AND (mb.is_active = 1 OR mb.is_active IS NULL)
             GROUP BY mb.id`,
            [departmentId, month, year]
        );

        // Pre-fetch category names
        const catIds = [...new Set(items.map(i => i.category_id).filter(Boolean))];
        let categoriesMap = new Map();
        if (catIds.length > 0) {
            const [cats] = await db.execute(
                'SELECT id, category_name FROM categories WHERE id IN (?)',
                [catIds]
            );
            categoriesMap = new Map(cats.map(c => [c.id, c.category_name]));
        }

        const parseDetails = (raw) => {
            if (!raw) return {};
            const map = {};
            for (const part of raw.split('|')) {
                const [id, catId, budget, used] = part.split(':');
                if (!catId) continue;
                map[Number(catId)] = { id: Number(id), budget: Number(budget), used_amount: Number(used) };
            }
            return map;
        };

        const mandatoryBudget = budgets.find(b => Number(b.is_mandatory) === 1) || null;
        const othersBudget    = budgets.find(b => Number(b.is_mandatory) === 0) || null;

        if (!mandatoryBudget && !othersBudget) {
            const overDetails = items.map(item => ({
                category_id:   item.category_id,
                category_name: categoriesMap.get(item.category_id) || item.category_name || 'General',
                available:     0,
                required:      Number(item.sum_amount),
                shortfall:     Number(item.sum_amount)
            }));
            return {
                is_over_budget: true,
                message: 'Master budget tidak ditemukan/belum disetujui untuk periode ini.',
                over_budget_details: overDetails,
                master_budget_id: null
            };
        }

        const mandatoryDetailMap = mandatoryBudget ? parseDetails(mandatoryBudget.details_raw) : {};
        const othersDetailMap    = othersBudget    ? parseDetails(othersBudget.details_raw)    : {};

        let isOverBudget = false;
        let totalShortfall = 0;
        const overBudgetDetails = [];

        for (const item of items) {
            const catId      = Number(item.category_id);
            const required   = Number(item.sum_amount);
            const isMandatory = Boolean(item.is_mandatory);
            const catName    = categoriesMap.get(catId) || item.category_name || 'General';

            const detailMap  = isMandatory ? mandatoryDetailMap : othersDetailMap;
            const detail     = detailMap[catId] || null;
            const available  = detail ? (detail.budget - detail.used_amount) : 0;

            if (required > available) {
                isOverBudget = true;
                const shortfall = required - available;
                totalShortfall += shortfall;
                overBudgetDetails.push({ category_id: catId, category_name: catName, available, required, shortfall });
            }
        }

        return {
            is_over_budget: isOverBudget,
            total_shortfall: totalShortfall,
            over_budget_details: overBudgetDetails,
            master_budget_id: othersBudget?.id || mandatoryBudget?.id || null,
            mandatory_budget_id: mandatoryBudget?.id || null,
            others_budget_id: othersBudget?.id || null
        };
    }

    /**
     * Get all available borrow sources for a given period.
     * Mirrors Laravel GET /budgeting/available-budgets and /budgeting/available-borrow-sources
     * Excludes mandatory budgets (they cannot be borrowed).
     * Returns master budgets grouped with their details and remaining amounts.
     */
    async getAvailableBorrowSources(date, departmentId = null, month = null, year = null) {
        // Support both date string and explicit month+year params
        if (month && year) {
            month = Number(month);
            year  = Number(year);
        } else if (date) {
            const d = new Date(date);
            month = d.getMonth() + 1;
            year  = d.getFullYear();
        } else {
            const now = new Date();
            month = now.getMonth() + 1;
            year  = now.getFullYear();
        }

        // Only non-mandatory budgets can be borrowed (Laravel rule)
        const [rows] = await db.execute(
            `SELECT bd.id as budget_detail_id, bd.master_budget_id, bd.category_id, bd.category_name,
                    bd.budget, bd.used_amount,
                    mb.department_id, mb.is_mandatory, mb.bulan, mb.no_budgeting,
                    COALESCE(d.department_name, 'Direksi') as department_name
             FROM budget_details bd
             JOIN master_budget mb ON bd.master_budget_id = mb.id
             LEFT JOIN departments d ON mb.department_id = d.id
             WHERE mb.bulan = ? AND YEAR(mb.periode_awal) = ? AND LOWER(mb.status) = 'approved'
               AND (mb.is_active = 1 OR mb.is_active IS NULL)
               AND mb.is_mandatory = 0
             ORDER BY mb.id DESC`,
            [month, year]
        );

        return rows.map(b => {
            const available = Number(b.budget) - Number(b.used_amount);

            let type = 'External Department';
            if (departmentId && b.department_id == departmentId) {
                type = 'Internal Department';
            }
            const catLower = (b.category_name || '').toLowerCase();
            if (catLower.includes('all category') || catLower.includes('all cat')) {
                type = 'All Category';
            }

            return {
                budget_detail_id: b.budget_detail_id,
                master_budget_id: b.master_budget_id,
                no_budgeting:     b.no_budgeting,
                category_id:      b.category_id,
                category_name:    b.category_name,
                available_amount: available,
                department_id:    b.department_id,
                department_name:  b.department_name,
                is_mandatory:     Boolean(b.is_mandatory),
                type
            };
        }).filter(b => {
            // Must have remaining budget
            if (b.available_amount <= 0) return false;
            // All types allowed; mandatory already excluded at SQL level
            return true;
        });
    }
}

module.exports = new BudgetService();
