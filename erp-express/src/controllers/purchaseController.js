const db = require('../config/db');
const approvalService = require('../services/approvalService');

// ─── Utility ────────────────────────────────────────────────────────────────
const serialize = (data) => {
    if (!data) return data;
    const transform = (obj) => {
        if (obj === null || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(transform);
        const newObj = {};
        for (const [k, v] of Object.entries(obj)) {
            if (typeof v === 'bigint') newObj[k] = v.toString();
            else if (v instanceof Date) {
                const Y = v.getFullYear(), M = String(v.getMonth()+1).padStart(2,'0'), D = String(v.getDate()).padStart(2,'0');
                newObj[k] = `${Y}-${M}-${D}`;
            } else if (typeof v === 'object') newObj[k] = transform(v);
            else newObj[k] = v;
        }
        return newObj;
    };
    return transform(data);
};

exports.generatePRReference = async function (connection, departmentId, type = 'PR') {
    let deptCode = 'GEN';
    if (departmentId) {
        const [depts] = await connection.execute('SELECT department_code FROM departments WHERE id = ?', [departmentId]);
        if (depts.length > 0 && depts[0].department_code) deptCode = depts[0].department_code;
    }
    const now = new Date();
    const year  = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth()+1).padStart(2,'0');
    
    const prefix = `${type}/${deptCode}-EPU/${year}/${month}/`;
    const globalYearPrefix = `${type}/%/${year}/%`;
    
    const [latest] = await connection.execute(
        'SELECT reference FROM purchases WHERE reference LIKE ? ORDER BY id DESC LIMIT 1',
        [globalYearPrefix]
    );
    
    let sequence = 1;
    if (latest.length > 0) {
        const lastRef = latest[0].reference;
        const parts = lastRef.split('/');
        const lastSeqStr = parts[parts.length - 1];
        // Reset to 1 if coming from old DDXXXX format
        if (lastSeqStr.length === 4 && !isNaN(parseInt(lastSeqStr))) {
            sequence = parseInt(lastSeqStr) + 1;
        } else {
            sequence = 1;
        }
    }
    return `${prefix}${String(sequence).padStart(4, '0')}`;
}

// ─── Helper: get own department budgets with their details ───────────────────
async function getOwnBudgets(connection, departmentId, dateStr) {
    const d = new Date(dateStr);
    const month = d.getMonth() + 1;
    const year  = d.getFullYear();

    const [budgets] = await connection.execute(
        `SELECT mb.*, GROUP_CONCAT(bd.id, ':', bd.category_id, ':', bd.budget, ':', bd.used_amount SEPARATOR '|') as details_raw
         FROM master_budget mb
         LEFT JOIN budget_details bd ON bd.master_budget_id = mb.id
         WHERE mb.department_id = ? AND mb.bulan = ? AND YEAR(mb.periode_awal) = ? AND LOWER(mb.status) = 'approved'
         GROUP BY mb.id`,
        [departmentId, month, year]
    );

    const parseDetails = (raw) => {
        if (!raw) return {};
        const map = {};
        for (const part of raw.split('|')) {
            const [id, catId, budget, used] = part.split(':');
            if (!catId) continue;
            map[Number(catId)] = { id: Number(id), category_id: Number(catId), budget: Number(budget), used_amount: Number(used) };
        }
        return map;
    };

    const mandatoryBudget = budgets.find(b => Number(b.is_mandatory) === 1) || null;
    const othersBudget    = budgets.find(b => Number(b.is_mandatory) === 0) || null;

    if (mandatoryBudget) mandatoryBudget.detailsMap = parseDetails(mandatoryBudget.details_raw);
    if (othersBudget)    othersBudget.detailsMap    = parseDetails(othersBudget.details_raw);

    return { mandatoryBudget, othersBudget };
}

// ─── Helper: process budget allocation per category (Laravel port) ────────────
// Returns { allocationsToCreate, borrowedAmountTotal, shortfallsPerCategory }
// addBackPurchaseId: if set, add existing allocations back (for UPDATE)
async function processBudgetAllocations(connection, budget, budgetByCategory, addBackPurchaseId = null) {
    let borrowedAmountTotal = 0;
    const shortfallsPerCategory = {};
    const allocationsToCreate = [];

    if (!budget) {
        // No own budget → everything goes to borrow
        for (const [catId, required] of Object.entries(budgetByCategory)) {
            borrowedAmountTotal += required;
            shortfallsPerCategory[catId] = (shortfallsPerCategory[catId] || 0) + required;
        }
        return { allocationsToCreate, borrowedAmountTotal, shortfallsPerCategory };
    }

    const detailsMap = budget.detailsMap || {};

    for (const [catIdStr, required] of Object.entries(budgetByCategory)) {
        const catId  = Number(catIdStr);
        const detail = detailsMap[catId] || null;
        let available = detail ? (detail.budget - detail.used_amount) : 0;

        // Add back existing allocation for this PR (for UPDATE)
        if (addBackPurchaseId && detail) {
            const [oldAllocs] = await connection.execute(
                'SELECT amount FROM purchase_budget_allocations WHERE purchase_id = ? AND source_master_budget_id = ? AND source_budget_detail_id = ?',
                [addBackPurchaseId, budget.id, detail.id]
            );
            for (const oa of oldAllocs) available += Number(oa.amount);
        } else if (addBackPurchaseId && !detail) {
            const [oldAllocs] = await connection.execute(
                'SELECT amount FROM purchase_budget_allocations WHERE purchase_id = ? AND source_master_budget_id = ? AND source_budget_detail_id IS NULL',
                [addBackPurchaseId, budget.id]
            );
            for (const oa of oldAllocs) available += Number(oa.amount);
        }

        if (required > available) {
            const shortfall = required - available;
            borrowedAmountTotal += shortfall;
            shortfallsPerCategory[catId] = (shortfallsPerCategory[catId] || 0) + shortfall;
            if (available > 0) {
                allocationsToCreate.push({ m_id: budget.id, d_id: detail ? detail.id : null, amt: available, t_cat_id: catId });
            }
        } else {
            allocationsToCreate.push({ m_id: budget.id, d_id: detail ? detail.id : null, amt: required, t_cat_id: catId });
        }
    }

    return { allocationsToCreate, borrowedAmountTotal, shortfallsPerCategory };
}

// ─── Helper: load purchase details in full for list/single ──────────────────
async function enrichPurchases(rows, connection) {
    if (rows.length === 0) return [];
    const purchaseIds = rows.map(r => r.id);
    const inList = purchaseIds.join(',');

    const [details] = await connection.execute(`
        SELECT pd.*,
               p.product_name as p_name, p.product_code as p_code, p.product_unit as p_unit,
               p.is_asset as p_is_asset, p.is_mandatory as p_is_mandatory,
               c.id as cat_id, c.category_name
        FROM purchase_details pd
        LEFT JOIN products p ON pd.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE pd.purchase_id IN (${inList})
    `);

    const [allocs] = await connection.execute(`
        SELECT pa.*, mb.no_budgeting as master_reference, mb.department_id as src_dept_id,
               bd.budget as detail_budget,
               c.category_name as target_category_name,
               sc.category_name as source_category_name,
               d.department_name as src_department_name
        FROM purchase_budget_allocations pa
        LEFT JOIN master_budget mb ON pa.source_master_budget_id = mb.id
        LEFT JOIN departments d ON mb.department_id = d.id
        LEFT JOIN budget_details bd ON pa.source_budget_detail_id = bd.id
        LEFT JOIN categories c ON pa.target_category_id = c.id
        LEFT JOIN categories sc ON bd.category_id = sc.id
        WHERE pa.purchase_id IN (${inList})
    `);

    const [appReqs] = await connection.execute(`
        SELECT * FROM approval_requests
        WHERE requestable_id IN (${inList})
        AND (requestable_type LIKE '%Purchase' OR requestable_type = 'Purchase Request' OR requestable_type = 'Over Budget')
    `);

    let allLogs = [];
    let allRuleLevels = [];
    if (appReqs.length > 0) {
        const appIds = appReqs.map(a => a.id).join(',');
        const [logs] = await connection.execute(`
            SELECT al.*, u.name as user_name
            FROM approval_request_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.approval_request_id IN (${appIds})
            ORDER BY al.id ASC
        `);
        allLogs = logs;

        const ruleIds = [...new Set(appReqs.map(a => a.approval_rules_id).filter(Boolean))];
        if (ruleIds.length > 0) {
            const [rLevels] = await connection.execute(`
                SELECT arl.id, arl.approval_rules_id, arl.level, arl.amount_limit, aru.role, aru.user_id, u.name as user_name
                FROM approval_rule_levels arl
                LEFT JOIN approval_rule_users aru ON arl.id = aru.approval_rule_levels_id AND aru.role = 'approver'
                LEFT JOIN users u ON aru.user_id = u.id
                WHERE arl.approval_rules_id IN (${ruleIds.join(',')})
                ORDER BY arl.level ASC
            `);
            allRuleLevels = rLevels;
        }
    }

    const masterIds = [...new Set(
        rows.map(r => r.master_budget_id)
            .concat(rows.map(r => r.borrowed_master_budget_id))
            .filter(Boolean)
    )];
    let allBudgets = [];
    if (masterIds.length > 0) {
        const [budgets] = await connection.execute(`
            SELECT mb.*, d.department_name, d.department_code
            FROM master_budget mb
            LEFT JOIN departments d ON mb.department_id = d.id
            WHERE mb.id IN (${masterIds.join(',')})
        `);
        allBudgets = budgets;
    }

    return rows.map(row => {
        const purchase = {
            ...row,
            department: { id: row.department_id, department_code: row.department_code, department_name: row.department_name },
            user: { id: row.users_id, name: row.user_name, email: row.user_email }
        };

        purchase.purchase_details = details
            .filter(d => d.purchase_id === row.id)
            .map(d => ({
                ...d,
                product: {
                    id: d.product_id,
                    product_name: d.p_name,
                    product_code: d.p_code,
                    product_unit: d.p_unit,
                    is_asset: d.p_is_asset,
                    is_mandatory: d.p_is_mandatory,
                    category: { id: d.cat_id, category_name: d.category_name }
                }
            }));

        purchase.purchase_budget_allocations = allocs.filter(a => a.purchase_id === row.id);

        const appReq = appReqs.find(ar => ar.requestable_id === row.id);
        if (appReq) {
            purchase.approval_request = {
                ...appReq,
                logs: allLogs.filter(l => l.approval_request_id === appReq.id).map(l => ({ ...l, user: { name: l.user_name } })),
                rule_levels: allRuleLevels.filter(rl => rl.approval_rules_id === appReq.approval_rules_id)
            };
        }

        purchase.master_budget = allBudgets.find(b => b.id === row.master_budget_id) || null;
        purchase.borrowed_master_budget = allBudgets.find(b => b.id === row.borrowed_master_budget_id) || null;

        return purchase;
    });
}

// ═══════════════════════════════════════════════════════════════════════════
//  GET /purchases
// ═══════════════════════════════════════════════════════════════════════════
exports.getPurchases = async (req, res) => {
    const conn = await db.getConnection();
    try {
        const { status, department_id, month, year } = req.query;
        let sql = `
            SELECT p.*,
                   d.department_code, d.department_name,
                   u.name as user_name, u.email as user_email
            FROM purchases p
            LEFT JOIN departments d ON p.department_id = d.id
            LEFT JOIN users u ON p.users_id = u.id
        `;
        const params = [];
        const conditions = [];

        // Permission-based filtering
        const reqUser = req.user;
        let canViewAll = false;
        if (reqUser) {
            canViewAll = reqUser.role_names?.includes('Super Admin') ||
                         reqUser.permissions?.includes('all_departments') || false;
        }

        if (!canViewAll && reqUser?.department_id) {
            conditions.push('p.department_id = ?');
            params.push(reqUser.department_id);
        } else if (department_id && department_id !== 'all') {
            conditions.push('p.department_id = ?');
            params.push(department_id);
        }

        if (status && status !== 'all') { conditions.push('LOWER(p.status) = ?'); params.push(status.toLowerCase()); }
        if (month  && month  !== 'all') { conditions.push('MONTH(p.date) = ?');   params.push(month); }
        if (year   && year   !== 'all') { conditions.push('YEAR(p.date) = ?');    params.push(year); }

        if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
        sql += ' ORDER BY p.id DESC';

        const [rows] = await conn.execute(sql, params);
        const result = await enrichPurchases(rows, conn);
        return res.json({ data: serialize(result), can_view_all_departments: canViewAll });
    } catch (err) {
        console.error('getPurchases Error:', err);
        res.status(500).json({ message: err.message });
    } finally { conn.release(); }
};

// ═══════════════════════════════════════════════════════════════════════════
//  GET /purchases/:id
// ═══════════════════════════════════════════════════════════════════════════
exports.getPurchaseById = async (req, res) => {
    const conn = await db.getConnection();
    try {
        const [rows] = await conn.execute(`
            SELECT p.*, d.department_name, d.department_code, u.name as user_name, u.email as user_email
            FROM purchases p
            LEFT JOIN departments d ON p.department_id = d.id
            LEFT JOIN users u ON p.users_id = u.id
            WHERE p.id = ?
        `, [req.params.id]);

        if (rows.length === 0) return res.status(404).json({ message: 'Purchase not found' });
        const enriched = await enrichPurchases(rows, conn);
        return res.json({ data: serialize(enriched[0]) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    } finally { conn.release(); }
};

// ═══════════════════════════════════════════════════════════════════════════
//  GET /purchases/unpaid-approved
// ═══════════════════════════════════════════════════════════════════════════
exports.getPurchasesUnpaidApproved = async (req, res) => {
    const conn = await db.getConnection();
    try {
        const { user_id, status } = req.query;
        let sql = `
            SELECT p.*, d.department_code, d.department_name, u.name as user_name, u.email as user_email
            FROM purchases p
            LEFT JOIN departments d ON p.department_id = d.id
            LEFT JOIN users u ON p.users_id = u.id
            WHERE LOWER(p.status) = 'approved'
        `;
        const params = [];
        if (status === 'Paid') { sql += " AND p.payment_status = 'Paid'"; }
        else if (status !== 'all') { sql += " AND (p.payment_status IS NULL OR p.payment_status != 'Paid')"; }
        if (user_id) { sql += ' AND p.users_id = ?'; params.push(user_id); }
        sql += ' ORDER BY p.id DESC';
        const [rows] = await conn.execute(sql, params);
        const result = await enrichPurchases(rows, conn);
        return res.json({ data: serialize(result) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    } finally { conn.release(); }
};

// ═══════════════════════════════════════════════════════════════════════════
//  POST /purchases  — Create Purchase Request
//  Mirrors Laravel POST /purchases logic exactly:
//  • is_asset items are EXCLUDED from budget deduction
//  • Items grouped by category & mandatory type
//  • Per-category budget checking using budget_details
//  • Borrowing required if own budget insufficient
//  • Mandatory budgets cannot be borrowed
// ═══════════════════════════════════════════════════════════════════════════
exports.createPurchase = async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const {
            date: rawDate, department_id, supplier_id, items, users_id, note,
            tax_percentage, discount_percentage, shipping_amount,
            source_master_budget_id,
            source_budget_detail_id,
            status: requestStatus, pr_type
        } = req.body;

        let supplierName = req.body.supplier_name || null;
        let supplierIdNum = supplier_id ? Number(supplier_id) : null;
        if (supplierIdNum && !supplierName) {
            const [sRows] = await connection.execute('SELECT supplier_name FROM suppliers WHERE id = ?', [supplierIdNum]);
            if (sRows.length > 0) supplierName = sRows[0].supplier_name;
        }

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'Items are required' });
        }

        const date   = rawDate ? rawDate.split('T')[0] : new Date().toISOString().split('T')[0];
        const userId = req.user?.id || users_id || 1;
        const prNote = note || '';

        const borrowedMasterBudgetId = source_master_budget_id ? Number(source_master_budget_id) : null;
        const borrowedBudgetDetailId = source_budget_detail_id ? Number(source_budget_detail_id) : null;

        // ── 1. Fetch product info ──────────────────────────────────────────
        const productIds = [...new Set(items.map(i => Number(i.product_id)))];
        const [products] = await connection.query(
            'SELECT id, product_name, product_code, product_unit, is_mandatory, is_asset, category_id FROM products WHERE id IN (?)',
            [productIds]
        );
        const productsMap = new Map(products.map(p => [p.id, p]));

        // ── 2. Compute totals & group by category ─────────────────────────
        let calculatedTotal      = 0;
        let budgetRequiredTotal  = 0;
        let mandatoryAmount      = 0;
        let nonMandatoryAmount   = 0;
        const budgetByCategoryMandatory = {}; // { catId: amount }
        const budgetByCategoryOthers    = {}; // { catId: amount }
        for (const item of items) {
            const lineTotal = Number(item.price) * Number(item.quantity);
            calculatedTotal += lineTotal;

            const product = productsMap.get(Number(item.product_id));
            // is_asset: check item flag OR product master flag
            const isAsset     = item.is_asset ? true : (product ? Boolean(Number(product.is_asset)) : false);
            const isMandatory = product ? Boolean(Number(product.is_mandatory)) : false;

            if (!isAsset) {
                if (isMandatory) mandatoryAmount    += lineTotal;
                else             nonMandatoryAmount += lineTotal;

                budgetRequiredTotal += lineTotal;
                const catId = product ? (product.category_id || 0) : 0;
                if (isMandatory) budgetByCategoryMandatory[catId] = (budgetByCategoryMandatory[catId] || 0) + lineTotal;
                else             budgetByCategoryOthers[catId]    = (budgetByCategoryOthers[catId]    || 0) + lineTotal;
            }
        }

        // ── 3. Load own department budgets ────────────────────────────────
        const { mandatoryBudget: ownMandatoryBudget, othersBudget: ownOthersBudget } =
            await getOwnBudgets(connection, department_id, date);

        // ── 4. Process allocations per category (Laravel logic) ───────────
        let totalBorrowedAmount    = 0;
        let totalShortfalls        = {};
        let allocationsToCreate    = [];

        const mandatoryResult = await processBudgetAllocations(connection, ownMandatoryBudget, budgetByCategoryMandatory);
        const othersResult    = await processBudgetAllocations(connection, ownOthersBudget,    budgetByCategoryOthers);

        allocationsToCreate.push(...mandatoryResult.allocationsToCreate, ...othersResult.allocationsToCreate);
        totalBorrowedAmount += mandatoryResult.borrowedAmountTotal + othersResult.borrowedAmountTotal;
        for (const [catId, amt] of Object.entries(mandatoryResult.shortfallsPerCategory)) {
            totalShortfalls[catId] = (totalShortfalls[catId] || 0) + amt;
        }
        for (const [catId, amt] of Object.entries(othersResult.shortfallsPerCategory)) {
            totalShortfalls[catId] = (totalShortfalls[catId] || 0) + amt;
        }

        // ── 5. Validate & build borrowing allocation ──────────────────────
        if (totalBorrowedAmount > 0) {
            if (!borrowedMasterBudgetId) {
                await connection.rollback();
                return res.status(400).json({
                    message: 'Budget tidak mencukupi. Silahkan pilih sumber pinjaman.',
                    shortfall: totalBorrowedAmount
                });
            }

            const [sourceBudgets] = await connection.execute('SELECT * FROM master_budget WHERE id = ?', [borrowedMasterBudgetId]);
            if (!sourceBudgets.length) {
                await connection.rollback();
                return res.status(400).json({ message: 'Budget pinjaman tidak ditemukan.' });
            }
            const sourceBudget = sourceBudgets[0];
            if (Number(sourceBudget.is_mandatory)) {
                await connection.rollback();
                return res.status(400).json({ message: 'Mandatory Budget tidak boleh dipinjam.' });
            }

            const isInternal = ownOthersBudget && Number(sourceBudget.department_id) === Number(ownOthersBudget.department_id);

            for (const [targetCatId, amount] of Object.entries(totalShortfalls)) {
                allocationsToCreate.push({
                    m_id:   borrowedMasterBudgetId,
                    d_id:   borrowedBudgetDetailId,
                    amt:    amount,
                    t_cat_id: Number(targetCatId),
                    is_int: isInternal ? 1 : 0,
                    is_ext: isInternal ? 0 : 1
                });
            }
        }

        // ── 6. Reference number ───────────────────────────────────────────
        const prTypePrefix = pr_type === 'direct' ? 'PL' : 'PR';
        const reference = req.body.reference && req.body.reference !== '' 
            ? req.body.reference 
            : await exports.generatePRReference(connection, department_id, prTypePrefix);

        // ── 7. Primary master budget for header ────────────────────────────
        const primaryMasterBudget = ownOthersBudget || ownMandatoryBudget;

        // ── 8. Insert purchase header ──────────────────────────────────────
        const [pResult] = await connection.execute(
            `INSERT INTO purchases (
                date, reference, department_id, supplier_id, supplier_name, total_amount, budget_amount,
                mandatory_amount, non_mandatory_amount, status, users_id,
                note, tax_percentage, discount_percentage, shipping_amount,
                borrowed_master_budget_id, borrowed_amount,
                master_budget_id, due_amount, payment_status,
                pr_type,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                date, reference, department_id, calculatedTotal, budgetRequiredTotal,
                mandatoryAmount, nonMandatoryAmount, requestStatus || 'Pending', userId,
                prNote, tax_percentage || 0, discount_percentage || 0, shipping_amount || 0,
                borrowedMasterBudgetId, totalBorrowedAmount,
                primaryMasterBudget ? primaryMasterBudget.id : null,
                calculatedTotal, 'Unpaid', pr_type || 'normal'
            ]
        );
        const purchaseId = pResult.insertId;

        // ── 9. Insert purchase details ─────────────────────────────────────
        for (const item of items) {
            const product     = productsMap.get(Number(item.product_id));
            const productName = item.product_name || (product?.product_name) || 'Custom Item';
            const productCode = item.product_code || (product?.product_code) || '-';
            const productUnit = item.product_unit || (product?.product_unit) || 'Unit';
            const isAsset     = item.is_asset ? 1 : (product ? Number(product.is_asset) : 0);

            await connection.execute(
                `INSERT INTO purchase_details (
                    purchase_id, product_id, product_name, quantity, price, sub_total,
                    product_code, product_unit, unit_price, is_asset, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [
                    purchaseId, item.product_id || null, productName,
                    item.quantity, item.price, Number(item.price) * Number(item.quantity),
                    productCode, productUnit, item.price, isAsset
                ]
            );
        }

        // ── 10. Insert purchase budget allocations ────────────────────────
        for (const alloc of allocationsToCreate) {
            await connection.execute(
                `INSERT INTO purchase_budget_allocations (
                    purchase_id, purchase_detail_id, source_master_budget_id, source_budget_detail_id,
                    target_category_id, amount, is_borrowed_internal, is_borrowed_external,
                    is_applied, created_at, updated_at
                ) VALUES (?, 0, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
                [
                    purchaseId, alloc.m_id, alloc.d_id,
                    alloc.t_cat_id || null, alloc.amt,
                    alloc.is_int || 0, alloc.is_ext || 0
                ]
            );
        }

        // ── 11. Create Approval Request ───────────────────────────────────
        const hasBorrowing   = totalBorrowedAmount > 0;
        const approvalName   = hasBorrowing ? 'Over Budget' : 'Purchase Request';
        const modelClass     = 'Modules\\Purchase\\Entities\\Purchase';

        const [types] = await connection.execute(
            'SELECT id FROM approval_types WHERE approval_name IN (?, "Purchase Request") ORDER BY (approval_name = ?) DESC LIMIT 1',
            [approvalName, approvalName]
        );

        let finalStatus = requestStatus || 'Pending';
        if (!requestStatus && types.length > 0) {
            const approval = await approvalService.createRequest(
                modelClass, purchaseId, types[0].id, calculatedTotal, userId, connection
            );
            finalStatus = approval.status.charAt(0).toUpperCase() + approval.status.slice(1);
        }

        if (finalStatus !== (requestStatus || 'Pending')) {
            await connection.execute(
                'UPDATE purchases SET status = ? WHERE id = ?',
                [finalStatus, purchaseId]
            );
        }

        await connection.commit();
        return res.status(201).json({
            message: 'Purchase request created successfully',
            id: purchaseId.toString(),
            reference,
            status: finalStatus
        });

    } catch (error) {
        await connection.rollback();
        console.error('createPurchase Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

// ═══════════════════════════════════════════════════════════════════════════
//  PUT /purchases/:id  — Update Purchase Request (Pending only)
// ═══════════════════════════════════════════════════════════════════════════
exports.updatePurchase = async (req, res) => {
    const { id } = req.params;
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const [pRows] = await connection.execute('SELECT * FROM purchases WHERE id = ?', [id]);
        if (!pRows.length) throw new Error('Purchase not found');
        const purchase = pRows[0];
        if (purchase.status.toLowerCase() !== 'pending') {
            return res.status(403).json({ message: 'Hanya Purchase Request dengan status "Pending" yang dapat diedit.' });
        }

        const {
            date: rawDate, department_id, items, users_id, note,
            tax_percentage, discount_percentage, shipping_amount,
            source_master_budget_id, source_budget_detail_id
        } = req.body;

        if (!items || items.length === 0) return res.status(400).json({ message: 'Items are required' });

        const date   = rawDate ? rawDate.split('T')[0] : new Date().toISOString().split('T')[0];
        const userId = req.user?.id || users_id || 1;
        const prNote = note || '';
        const borrowedMasterBudgetId = source_master_budget_id ? Number(source_master_budget_id) : null;
        const borrowedBudgetDetailId = source_budget_detail_id ? Number(source_budget_detail_id) : null;

        // ── 1. Fetch product info ──────────────────────────────────────────
        const productIds = [...new Set(items.map(i => Number(i.product_id)))];
        const [products] = await connection.query(
            'SELECT id, product_name, product_code, product_unit, is_mandatory, is_asset, category_id FROM products WHERE id IN (?)',
            [productIds]
        );
        const productsMap = new Map(products.map(p => [p.id, p]));

        // ── 2. Compute totals & group by category ─────────────────────────
        let calculatedTotal     = 0;
        let budgetRequiredTotal = 0;
        let mandatoryAmount     = 0;
        let nonMandatoryAmount  = 0;
        const budgetByCategoryMandatory = {};
        const budgetByCategoryOthers    = {};
        for (const item of items) {
            const lineTotal = Number(item.price) * Number(item.quantity);
            calculatedTotal += lineTotal;
            const product   = productsMap.get(Number(item.product_id));
            const isAsset   = item.is_asset ? true : (product ? Boolean(Number(product.is_asset)) : false);
            const isMandatory = product ? Boolean(Number(product.is_mandatory)) : false;

            if (!isAsset) {
                if (isMandatory) mandatoryAmount    += lineTotal;
                else             nonMandatoryAmount += lineTotal;

                budgetRequiredTotal += lineTotal;
                const catId = product ? (product.category_id || 0) : 0;
                if (isMandatory) budgetByCategoryMandatory[catId] = (budgetByCategoryMandatory[catId] || 0) + lineTotal;
                else             budgetByCategoryOthers[catId]    = (budgetByCategoryOthers[catId]    || 0) + lineTotal;
            }
        }

        // ── 3. Load own department budgets ────────────────────────────────
        const { mandatoryBudget: ownMandatoryBudget, othersBudget: ownOthersBudget } =
            await getOwnBudgets(connection, department_id, date);

        // ── 4. Process allocations with add-back logic for update ──────────
        let totalBorrowedAmount = 0;
        let totalShortfalls     = {};
        let allocationsToCreate = [];

        const mandatoryResult = await processBudgetAllocations(connection, ownMandatoryBudget, budgetByCategoryMandatory, id);
        const othersResult    = await processBudgetAllocations(connection, ownOthersBudget,    budgetByCategoryOthers,    id);

        allocationsToCreate.push(...mandatoryResult.allocationsToCreate, ...othersResult.allocationsToCreate);
        totalBorrowedAmount += mandatoryResult.borrowedAmountTotal + othersResult.borrowedAmountTotal;
        for (const [catId, amt] of Object.entries(mandatoryResult.shortfallsPerCategory)) {
            totalShortfalls[catId] = (totalShortfalls[catId] || 0) + amt;
        }
        for (const [catId, amt] of Object.entries(othersResult.shortfallsPerCategory)) {
            totalShortfalls[catId] = (totalShortfalls[catId] || 0) + amt;
        }

        // ── 5. Validate & build borrowing allocation ──────────────────────
        if (totalBorrowedAmount > 0) {
            if (!borrowedMasterBudgetId) {
                await connection.rollback();
                return res.status(400).json({
                    message: 'Budget tidak mencukupi untuk update ini. Pilih sumber pinjaman.',
                    shortfall: totalBorrowedAmount
                });
            }
            const [sourceBudgets] = await connection.execute('SELECT * FROM master_budget WHERE id = ?', [borrowedMasterBudgetId]);
            if (!sourceBudgets.length) { await connection.rollback(); return res.status(400).json({ message: 'Budget pinjaman tidak ditemukan.' }); }
            const sourceBudget = sourceBudgets[0];
            if (Number(sourceBudget.is_mandatory)) { await connection.rollback(); return res.status(400).json({ message: 'Mandatory Budget tidak boleh dipinjam.' }); }

            const isInternal = ownOthersBudget && Number(sourceBudget.department_id) === Number(ownOthersBudget.department_id);
            for (const [targetCatId, amount] of Object.entries(totalShortfalls)) {
                allocationsToCreate.push({
                    m_id: borrowedMasterBudgetId, d_id: borrowedBudgetDetailId,
                    amt: amount, t_cat_id: Number(targetCatId),
                    is_int: isInternal ? 1 : 0, is_ext: isInternal ? 0 : 1
                });
            }
        }

        // ── 6. Clear old details & allocations ─────────────────────────────
        await connection.execute('DELETE FROM purchase_details WHERE purchase_id = ?', [id]);
        await connection.execute('DELETE FROM purchase_budget_allocations WHERE purchase_id = ?', [id]);

        // ── 7. Delete old approval request ─────────────────────────────────
        const [oldApps] = await connection.execute(
            'SELECT id FROM approval_requests WHERE requestable_id = ? AND (requestable_type LIKE "%Purchase" OR requestable_type = "Purchase Request" OR requestable_type = "Over Budget")',
            [id]
        );
        for (const app of oldApps) {
            await connection.execute('DELETE FROM approval_request_logs WHERE approval_request_id = ?', [app.id]);
            await connection.execute('DELETE FROM approval_requests WHERE id = ?', [app.id]);
        }

        // ── 8. Update purchase header ──────────────────────────────────────
        const primaryMasterBudget = ownOthersBudget || ownMandatoryBudget;
        const reference = req.body.reference || purchase.reference;

        let supplierName = req.body.supplier_name || null;
        let supplierIdNum = req.body.supplier_id ? Number(req.body.supplier_id) : null;
        if (supplierIdNum && !supplierName) {
            const [sRows] = await connection.execute('SELECT supplier_name FROM suppliers WHERE id = ?', [supplierIdNum]);
            if (sRows.length > 0) supplierName = sRows[0].supplier_name;
        }

        await connection.execute(
            `UPDATE purchases SET
                date = ?, reference = ?, department_id = ?, supplier_id = ?, supplier_name = ?, total_amount = ?, budget_amount = ?,
                mandatory_amount = ?, non_mandatory_amount = ?, note = ?,
                tax_percentage = ?, discount_percentage = ?, shipping_amount = ?,
                borrowed_master_budget_id = ?, borrowed_amount = ?,
                master_budget_id = ?, due_amount = ?, updated_at = NOW()
             WHERE id = ?`,
            [
                date, reference, department_id, supplierIdNum, supplierName, calculatedTotal, budgetRequiredTotal,
                mandatoryAmount, nonMandatoryAmount, prNote,
                tax_percentage || 0, discount_percentage || 0, shipping_amount || 0,
                borrowedMasterBudgetId, totalBorrowedAmount,
                primaryMasterBudget ? primaryMasterBudget.id : null,
                calculatedTotal, id
            ]
        );

        // ── 9. Re-insert details ────────────────────────────────────────────
        for (const item of items) {
            const product     = productsMap.get(Number(item.product_id));
            const productName = item.product_name || product?.product_name || 'Custom Item';
            const productCode = item.product_code || product?.product_code || '-';
            const productUnit = item.product_unit || product?.product_unit || 'Unit';
            const isAsset     = item.is_asset ? 1 : (product ? Number(product.is_asset) : 0);

            await connection.execute(
                `INSERT INTO purchase_details (
                    purchase_id, product_id, product_name, quantity, price, sub_total,
                    product_code, product_unit, unit_price, is_asset, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [
                    id, item.product_id || null, productName,
                    item.quantity, item.price, Number(item.price) * Number(item.quantity),
                    productCode, productUnit, item.price, isAsset
                ]
            );
        }

        // ── 10. Re-insert allocations ──────────────────────────────────────
        for (const alloc of allocationsToCreate) {
            await connection.execute(
                `INSERT INTO purchase_budget_allocations (
                    purchase_id, purchase_detail_id, source_master_budget_id, source_budget_detail_id,
                    target_category_id, amount, is_borrowed_internal, is_borrowed_external,
                    is_applied, created_at, updated_at
                ) VALUES (?, 0, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
                [
                    id, alloc.m_id, alloc.d_id,
                    alloc.t_cat_id || null, alloc.amt,
                    alloc.is_int || 0, alloc.is_ext || 0
                ]
            );
        }

        // ── 11. Create new Approval Request ───────────────────────────────
        const hasBorrowing = totalBorrowedAmount > 0;
        const approvalName = hasBorrowing ? 'Over Budget' : 'Purchase Request';
        const modelClass   = 'Modules\\Purchase\\Entities\\Purchase';

        const [types] = await connection.execute(
            'SELECT id FROM approval_types WHERE approval_name IN (?, "Purchase Request") ORDER BY (approval_name = ?) DESC LIMIT 1',
            [approvalName, approvalName]
        );

        let finalStatus = 'Pending';
        if (types.length > 0) {
            const approval = await approvalService.createRequest(
                modelClass, id, types[0].id, calculatedTotal, userId, connection
            );
            finalStatus = approval.status.charAt(0).toUpperCase() + approval.status.slice(1);
        }

        await connection.execute('UPDATE purchases SET status = ? WHERE id = ?', [finalStatus, id]);

        await connection.commit();
        return res.json({ message: 'Purchase request updated successfully', status: finalStatus });

    } catch (error) {
        await connection.rollback();
        console.error('updatePurchase Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

// ═══════════════════════════════════════════════════════════════════════════
//  DELETE /purchases/:id
//  • If approved → rollback used_amount on master_budget & budget_details
//  • Always deletes details, allocations, approval records
// ═══════════════════════════════════════════════════════════════════════════
exports.deletePurchase = async (req, res) => {
    const { id } = req.params;
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const [pRows] = await connection.execute('SELECT * FROM purchases WHERE id = ?', [id]);
        if (!pRows.length) throw new Error('Purchase not found');
        const purchase = pRows[0];
        
        // Validation: Check if PR is already used in a PO
        const [poRows] = await connection.execute('SELECT id, reference FROM purchase_orders WHERE pr_id = ? LIMIT 1', [id]);
        if (poRows.length > 0) {
            throw new Error(`Purchase Request tidak dapat dihapus karena sudah digunakan dalam Purchase Order (${poRows[0].reference}).`);
        }

        // Rollback applied budget if approved
        if (purchase.status.toLowerCase() === 'approved') {
            const [allocs] = await connection.execute(
                'SELECT * FROM purchase_budget_allocations WHERE purchase_id = ? AND is_applied = 1',
                [id]
            );
            for (const alloc of allocs) {
                if (alloc.source_master_budget_id) {
                    await connection.execute(
                        'UPDATE master_budget SET used_amount = GREATEST(0, used_amount - ?) WHERE id = ?',
                        [Number(alloc.amount), alloc.source_master_budget_id]
                    );
                }
                if (alloc.source_budget_detail_id) {
                    await connection.execute(
                        'UPDATE budget_details SET used_amount = GREATEST(0, used_amount - ?) WHERE id = ?',
                        [Number(alloc.amount), alloc.source_budget_detail_id]
                    );
                }
            }
        }

        // Cleanup all related records
        await connection.execute('DELETE FROM purchase_details WHERE purchase_id = ?', [id]);
        await connection.execute('DELETE FROM purchase_budget_allocations WHERE purchase_id = ?', [id]);

        const [apps] = await connection.execute(
            'SELECT id FROM approval_requests WHERE requestable_id = ? AND (requestable_type LIKE "%Purchase" OR requestable_type = "Purchase Request" OR requestable_type = "Over Budget")',
            [id]
        );
        for (const app of apps) {
            await connection.execute('DELETE FROM approval_request_logs WHERE approval_request_id = ?', [app.id]);
            await connection.execute('DELETE FROM approval_requests WHERE id = ?', [app.id]);
        }

        await connection.execute('DELETE FROM purchases WHERE id = ?', [id]);

        await connection.commit();
        return res.json({ message: 'Purchase request deleted successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('deletePurchase Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

// ═══════════════════════════════════════════════════════════════════════════
//  PATCH /purchases/:id/update-borrowing-source
// ═══════════════════════════════════════════════════════════════════════════
exports.updateBorrowingSource = async (req, res) => {
    const { id } = req.params;
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const [pRows] = await connection.execute(`
            SELECT p.*, pd.is_asset, pd.sub_total, pd.product_id
            FROM purchases p WHERE p.id = ?
        `, [id]);
        if (!pRows.length) throw new Error('Purchase not found');
        const purchase = pRows[0];

        const { borrowed_master_budget_id, borrowed_budget_detail_id } = req.body;
        const borrowedMasterBudgetId = borrowed_master_budget_id ? Number(borrowed_master_budget_id) : null;
        const borrowedBudgetDetailId = borrowed_budget_detail_id ? Number(borrowed_budget_detail_id) : null;

        // Reload items
        const [details] = await connection.execute('SELECT * FROM purchase_details WHERE purchase_id = ?', [id]);
        const productIds = [...new Set(details.map(d => Number(d.product_id)).filter(Boolean))];

        let productsMap = new Map();
        if (productIds.length) {
            const [products] = await connection.query(
                'SELECT id, is_mandatory, is_asset, category_id FROM products WHERE id IN (?)',
                [productIds]
            );
            productsMap = new Map(products.map(p => [p.id, p]));
        }

        const budgetByCategoryMandatory = {};
        const budgetByCategoryOthers    = {};

        for (const detail of details) {
            if (detail.is_asset) continue;
            const product     = productsMap.get(Number(detail.product_id));
            const isMandatory = product ? Boolean(Number(product.is_mandatory)) : false;
            const catId       = product ? (product.category_id || 0) : 0;
            const amount      = Number(detail.sub_total);
            if (isMandatory) budgetByCategoryMandatory[catId] = (budgetByCategoryMandatory[catId] || 0) + amount;
            else             budgetByCategoryOthers[catId]    = (budgetByCategoryOthers[catId]    || 0) + amount;
        }

        const dateStr = purchase.date instanceof Date
            ? purchase.date.toISOString().split('T')[0]
            : String(purchase.date).split('T')[0];

        const { mandatoryBudget: ownMandatoryBudget, othersBudget: ownOthersBudget } =
            await getOwnBudgets(connection, purchase.department_id, dateStr);

        let totalBorrowedAmount = 0;
        let totalShortfalls     = {};
        let allocationsToCreate = [];

        const mandatoryResult = await processBudgetAllocations(connection, ownMandatoryBudget, budgetByCategoryMandatory, id);
        const othersResult    = await processBudgetAllocations(connection, ownOthersBudget,    budgetByCategoryOthers,    id);

        allocationsToCreate.push(...mandatoryResult.allocationsToCreate, ...othersResult.allocationsToCreate);
        totalBorrowedAmount += mandatoryResult.borrowedAmountTotal + othersResult.borrowedAmountTotal;
        for (const [catId, amt] of Object.entries(mandatoryResult.shortfallsPerCategory)) totalShortfalls[catId] = (totalShortfalls[catId] || 0) + amt;
        for (const [catId, amt] of Object.entries(othersResult.shortfallsPerCategory))    totalShortfalls[catId] = (totalShortfalls[catId] || 0) + amt;

        if (totalBorrowedAmount > 0 && borrowedMasterBudgetId) {
            const [srcBudgets] = await connection.execute('SELECT * FROM master_budget WHERE id = ?', [borrowedMasterBudgetId]);
            if (!srcBudgets.length) { await connection.rollback(); return res.status(400).json({ message: 'Budget pinjaman tidak ditemukan.' }); }
            const srcBudget  = srcBudgets[0];
            if (Number(srcBudget.is_mandatory)) { await connection.rollback(); return res.status(400).json({ message: 'Mandatory Budget tidak boleh dipinjam.' }); }

            const isInternal = ownOthersBudget && Number(srcBudget.department_id) === Number(ownOthersBudget.department_id);
            for (const [targetCatId, amount] of Object.entries(totalShortfalls)) {
                allocationsToCreate.push({
                    m_id: borrowedMasterBudgetId, d_id: borrowedBudgetDetailId,
                    amt: amount, t_cat_id: Number(targetCatId),
                    is_int: isInternal ? 1 : 0, is_ext: isInternal ? 0 : 1
                });
            }
        }

        await connection.execute(
            'UPDATE purchases SET borrowed_master_budget_id = ?, borrowed_amount = ?, updated_at = NOW() WHERE id = ?',
            [borrowedMasterBudgetId, borrowedMasterBudgetId ? totalBorrowedAmount : 0, id]
        );

        await connection.execute('DELETE FROM purchase_budget_allocations WHERE purchase_id = ?', [id]);
        for (const alloc of allocationsToCreate) {
            await connection.execute(
                `INSERT INTO purchase_budget_allocations (
                    purchase_id, purchase_detail_id, source_master_budget_id, source_budget_detail_id,
                    target_category_id, amount, is_borrowed_internal, is_borrowed_external,
                    is_applied, created_at, updated_at
                ) VALUES (?, 0, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
                [id, alloc.m_id, alloc.d_id, alloc.t_cat_id || null, alloc.amt, alloc.is_int || 0, alloc.is_ext || 0]
            );
        }

        await connection.commit();
        return res.json({ message: 'Borrowing source updated', borrowed_amount: totalBorrowedAmount });
    } catch (error) {
        await connection.rollback();
        console.error('updateBorrowingSource Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

// ═══════════════════════════════════════════════════════════════════════════
//  POST /purchases/:id/update-actual
// ═══════════════════════════════════════════════════════════════════════════
exports.updatePurchaseActual = async (req, res) => {
    const { id } = req.params;
    const { items, is_paid } = req.body;
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const [purchases] = await connection.execute('SELECT * FROM purchases WHERE id = ?', [id]);
        if (!purchases.length) throw new Error('Purchase not found');
        const purchase = purchases[0];
        if (purchase.status.toLowerCase() !== 'approved') throw new Error('Only approved purchases can be updated');

        let newTotal            = 0;
        let budgetItemsOldTotal = 0;
        let budgetItemsNewTotal = 0;

        for (const itemData of items) {
            const [detailRows] = await connection.execute('SELECT * FROM purchase_details WHERE id = ? AND purchase_id = ?', [itemData.id, id]);
            if (!detailRows.length) throw new Error('Invalid purchase detail');
            const detail = detailRows[0];

            const actualTotal = Number(itemData.actual_price) * Number(itemData.quantity);
            const oldSubTotal = Number(detail.sub_total);

            await connection.execute(
                'UPDATE purchase_details SET price = ?, unit_price = ?, quantity = ?, sub_total = ?, updated_at = NOW() WHERE id = ?',
                [itemData.actual_price, itemData.actual_price, itemData.quantity, actualTotal, itemData.id]
            );

            newTotal += actualTotal;
            if (!detail.is_asset) {
                budgetItemsOldTotal += oldSubTotal;
                budgetItemsNewTotal += actualTotal;
            }
        }

        const budgetDelta = budgetItemsNewTotal - budgetItemsOldTotal;

        if (budgetDelta !== 0) {
            // Prioritize borrowed allocations, then any allocation
            const [allocs] = await connection.execute(
                'SELECT * FROM purchase_budget_allocations WHERE purchase_id = ? ORDER BY (is_borrowed_internal + is_borrowed_external) DESC, amount DESC LIMIT 1',
                [id]
            );
            if (allocs.length > 0) {
                const alloc = allocs[0];
                const newAmt = Math.max(0, Number(alloc.amount) + budgetDelta);
                await connection.execute('UPDATE purchase_budget_allocations SET amount = ? WHERE id = ?', [newAmt, alloc.id]);

                if (alloc.is_applied) {
                    if (alloc.source_master_budget_id) {
                        await connection.execute(
                            'UPDATE master_budget SET used_amount = GREATEST(0, used_amount + ?) WHERE id = ?',
                            [budgetDelta, alloc.source_master_budget_id]
                        );
                    }
                    if (alloc.source_budget_detail_id) {
                        await connection.execute(
                            'UPDATE budget_details SET used_amount = GREATEST(0, used_amount + ?) WHERE id = ?',
                            [budgetDelta, alloc.source_budget_detail_id]
                        );
                    }
                }
            }
        }

        // Recalculate summary columns
        const [updatedDetails] = await connection.execute('SELECT * FROM purchase_details WHERE purchase_id = ?', [id]);
        const productIds = [...new Set(updatedDetails.map(d => Number(d.product_id)).filter(Boolean))];
        let productsMap = new Map();
        if (productIds.length) {
            const [prods] = await connection.query('SELECT id, is_mandatory FROM products WHERE id IN (?)', [productIds]);
            productsMap = new Map(prods.map(p => [p.id, p]));
        }

        let sumMandatory = 0, sumOthers = 0, sumAsset = 0;
        for (const d of updatedDetails) {
            const sub = Number(d.sub_total);
            if (d.is_asset) { sumAsset += sub; continue; }
            const prod = productsMap.get(Number(d.product_id));
            if (prod && Number(prod.is_mandatory)) sumMandatory += sub;
            else sumOthers += sub;
        }

        const [currentAllocs] = await connection.execute('SELECT * FROM purchase_budget_allocations WHERE purchase_id = ?', [id]);
        const sumBudget   = currentAllocs.reduce((s, a) => s + Number(a.amount), 0);
        const sumBorrowed = currentAllocs
            .filter(a => a.is_borrowed_internal || a.is_borrowed_external)
            .reduce((s, a) => s + Number(a.amount), 0);

        await connection.execute(
            `UPDATE purchases SET
                total_amount = ?, budget_amount = ?,
                mandatory_amount = ?, non_mandatory_amount = ?,
                borrowed_amount = ?, asset_amount = ?,
                payment_status = ?, updated_at = NOW()
             WHERE id = ?`,
            [newTotal, sumBudget, sumMandatory, sumOthers, sumBorrowed, sumAsset, is_paid ? 'Paid' : 'Unpaid', id]
        );

        await connection.commit();
        return res.json({ message: 'Purchase updated successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('updatePurchaseActual Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

// ═══════════════════════════════════════════════════════════════════════════
//  POST /purchases/:id/close
// ═══════════════════════════════════════════════════════════════════════════
exports.closePurchase = async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id || 1;
    try {
        const [rows] = await db.execute('SELECT id, is_closed FROM purchases WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Purchase Request tidak ditemukan' });
        
        await db.execute(
            'UPDATE purchases SET is_closed = true, closed_at = NOW(), closed_by = ? WHERE id = ?',
            [userId, id]
        );
        return res.json({ message: 'Purchase Request berhasil ditutup.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════
//  POST /purchases/:id/reopen
// ═══════════════════════════════════════════════════════════════════════════
exports.reopenPurchase = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.execute('SELECT id, is_closed FROM purchases WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Purchase Request tidak ditemukan' });
        
        await db.execute(
            'UPDATE purchases SET is_closed = false, closed_at = NULL, closed_by = NULL WHERE id = ?',
            [id]
        );
        return res.json({ message: 'Purchase Request berhasil dibuka kembali.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
