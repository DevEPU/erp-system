const db = require('../config/db');
const approvalService = require('../services/approvalService');

// Utility function for BigInt serialization
const serialize = (data) => JSON.parse(JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
));

exports.getApprovalTypes = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM approval_types ORDER BY id DESC');
        return res.json({ data: serialize(rows) });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.createApprovalType = async (req, res) => {
    const { approval_code, approval_name } = req.body;
    try {
        await db.execute('INSERT INTO approval_types (approval_code, approval_name, created_at, updated_at) VALUES (?, ?, NOW(), NOW())', [approval_code, approval_name]);
        return res.status(201).json({ message: 'Type created' });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getApprovalRules = async (req, res) => {
    try {
        const [rules] = await db.execute('SELECT ar.*, t.approval_name FROM approval_rules ar LEFT JOIN approval_types t ON ar.approval_types_id = t.id ORDER BY id DESC');
        
        // Fetch nested levels and users for each rule
        const rulesWithTypes = rules.map(rule => ({
            ...rule,
            type: {
                id: rule.approval_types_id,
                approval_name: rule.approval_name
            }
        }));

        for (let rule of rulesWithTypes) {
            const [levels] = await db.execute('SELECT * FROM approval_rule_levels WHERE approval_rules_id = ? ORDER BY level ASC', [rule.id]);
            for (let level of levels) {
                const [users] = await db.execute('SELECT * FROM approval_rule_users WHERE approval_rule_levels_id = ?', [level.id]);
                level.users = users;
            }
            rule.levels = levels;
        }

        return res.json({ data: serialize(rulesWithTypes) });
    } catch (error) { 
        console.error('getApprovalRules error:', error);
        res.status(500).json({ message: error.message }); 
    }
};

exports.getApprovalRulesFormData = async (req, res) => {
    try {
        const [types] = await db.execute('SELECT * FROM approval_types');
        const [users] = await db.execute('SELECT id, name FROM users');
        return res.json({ types: serialize(types), users: serialize(users) });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// --- CORE APPROVAL LOGIC ---

exports.getApprovalRequests = async (req, res) => {
    try {
        const { type, status = 'pending', user_id, month, year } = req.query;

        if (!user_id) return res.json({ data: [] });

        const dbTypeMap = {
            'budget': ['Modules\\Budget\\Entities\\MasterBudget', 'Master Budget', 'Modules\\Budget\\Entities\\MasterBudget'],
            'purchase': ['Modules\\Purchase\\Entities\\Purchase', 'Purchase Request', 'Over Budget', 'Modules\\Purchase\\Entities\\Purchase'],
            'target': ['Modules\\TargetSale\\Entities\\TargetSale', 'Target Sales', 'Modules\\TargetSale\\Entities\\TargetSale'],
            'product': ['Modules\\Product\\Entities\\ProductRequest', 'Product Request', 'Modules\\Product\\Entities\\ProductRequest'],
            'mrp': ['Modules\\MRP\\Entities\\MRP', 'MRP', 'Modules\\MRP\\Entities\\MRP']
        };

        let query = `
            SELECT ar.*, t.approval_name, u.name as creator_name
            FROM approval_requests ar
            LEFT JOIN approval_types t ON ar.approval_types_id = t.id
            LEFT JOIN users u ON ar.created_by = u.id
            JOIN approval_request_logs al ON ar.id = al.approval_request_id
            WHERE ar.status = ?
            AND al.user_id = ?
            AND al.action = "assigned"
            AND al.level = ar.current_level
        `;
        let params = [status.toLowerCase(), user_id];

        if (type && dbTypeMap[type]) {
            const types = dbTypeMap[type];
            query += ' AND ar.requestable_type IN (' + types.map(() => '?').join(',') + ')';
            params.push(...types);
        }

        query += ' ORDER BY ar.created_at DESC';
        const [requests] = await db.execute(query, params);

        // Polymorphic Loading & Filtering
        const resultRequests = [];

        for (let reqObj of requests) {
            const tableMap = {
                'Modules\\Budget\\Entities\\MasterBudget': { table: 'master_budget', includes: 'details', dateField: 'bulan' },
                'Master Budget': { table: 'master_budget', includes: 'details', dateField: 'bulan' },
                'Modules\\Purchase\\Entities\\Purchase': { table: 'purchases', includes: 'details', dateField: 'date' },
                'Purchase Request': { table: 'purchases', includes: 'details', dateField: 'date' },
                'Over Budget': { table: 'purchases', includes: 'details', dateField: 'date' },
                'Modules\\TargetSale\\Entities\\TargetSale': { table: 'target_sales', includes: null, dateField: 'month' },
                'Target Sales': { table: 'target_sales', includes: null, dateField: 'month' },
                'Modules\\Product\\Entities\\ProductRequest': { table: 'product_requests', includes: null, dateField: 'created_at' },
                'Product Request': { table: 'product_requests', includes: null, dateField: 'created_at' }
            };

            const config = tableMap[reqObj.requestable_type];
            if (config) {
                const [source] = await db.execute(`SELECT * FROM ${config.table} WHERE id = ?`, [reqObj.requestable_id]);
                if (source.length > 0) {
                    const requestable = source[0];
                    
                    // Month/Year Filtering
                    if (month || year) {
                        let match = true;
                        if (month) {
                            const sourceMonth = config.dateField === 'date' || config.dateField === 'created_at' 
                                ? new Date(requestable[config.dateField]).getMonth() + 1 
                                : parseInt(requestable[config.dateField]);
                            if (sourceMonth !== parseInt(month)) match = false;
                        }
                        if (year && match) {
                            const sourceYear = config.dateField === 'date' || config.dateField === 'created_at'
                                ? new Date(requestable[config.dateField]).getFullYear()
                                : (config.table === 'master_budget' ? new Date(requestable.periode_awal).getFullYear() : parseInt(requestable.year));
                            if (sourceYear !== parseInt(year)) match = false;
                        }
                        if (!match) continue;
                    }

                    reqObj.requestable = requestable;
                    if (config.includes === 'details') {
                        if (config.table === 'master_budget') {
                            // Budget details
                            const [details] = await db.execute(
                                'SELECT bd.*, c.category_name FROM budget_details bd LEFT JOIN categories c ON bd.category_id = c.id WHERE bd.master_budget_id = ?',
                                [reqObj.requestable_id]
                            );
                            reqObj.requestable.details = details;
                        } else {
                            // Purchase details with product & category info
                            const [details] = await db.execute(
                                `SELECT pd.*, p.product_name, p.product_code, p.product_unit, p.is_asset as p_is_asset, p.is_mandatory as p_is_mandatory,
                                        c.id as cat_id, c.category_name
                                 FROM purchase_details pd
                                 LEFT JOIN products p ON pd.product_id = p.id
                                 LEFT JOIN categories c ON p.category_id = c.id
                                 WHERE pd.purchase_id = ?`,
                                [reqObj.requestable_id]
                            );
                            reqObj.requestable.purchase_details = details.map(d => ({
                                ...d,
                                product_name: d.product_name || d.product_name,
                                product_unit: d.product_unit || 'Unit',
                                is_asset: !!d.is_asset,
                                product: {
                                    is_mandatory: !!d.p_is_mandatory,
                                    is_asset: !!d.p_is_asset,
                                    category: { id: d.cat_id, category_name: d.category_name }
                                }
                            }));

                            // Load master_budget for purchase
                            if (requestable.master_budget_id) {
                                const [mb] = await db.execute(
                                    `SELECT mb.*, COALESCE(d.department_name, 'Direksi') as dept_name
                                     FROM master_budget mb
                                     LEFT JOIN departments d ON mb.department_id = d.id
                                     WHERE mb.id = ?`,
                                    [requestable.master_budget_id]
                                );
                                if (mb.length > 0) {
                                    reqObj.requestable.master_budget = {
                                        ...mb[0],
                                        department: { department_name: mb[0].dept_name }
                                    };
                                }
                            }

                            // Load purchase_budget_allocations
                            const [allocs] = await db.execute(
                                `SELECT pba.*,
                                        mb.no_budgeting as master_reference,
                                        COALESCE(d.department_name, 'Direksi') as src_department_name,
                                        bd.category_name as source_category_name
                                 FROM purchase_budget_allocations pba
                                 LEFT JOIN master_budget mb ON pba.source_master_budget_id = mb.id
                                 LEFT JOIN departments d ON mb.department_id = d.id
                                 LEFT JOIN budget_details bd ON pba.source_budget_detail_id = bd.id
                                 WHERE pba.purchase_id = ?`,
                                [reqObj.requestable_id]
                            );
                            reqObj.requestable.purchase_budget_allocations = allocs;
                        }
                    }
                    
                    // Add department name if exists
                    if (reqObj.requestable.department_id !== undefined) {
                        const [dept] = await db.execute('SELECT department_name FROM departments WHERE id = ?', [reqObj.requestable.department_id]);
                        if (dept.length > 0) reqObj.requestable.department = dept[0];
                    }
                }
            }

            // Load Logs
            const [logs] = await db.execute(`
                SELECT al.*, u.name as user_name 
                FROM approval_request_logs al 
                LEFT JOIN users u ON al.user_id = u.id 
                WHERE al.approval_request_id = ?
                ORDER BY al.id ASC
            `, [reqObj.id]);
            reqObj.logs = logs.map(l => ({
                ...l,
                user: { name: l.user_name }
            }));

            reqObj.creator = { name: reqObj.creator_name || 'System' };
            resultRequests.push(reqObj);
        }

        return res.json({ data: serialize(resultRequests) });
    } catch (error) { 
        console.error(error);
        res.status(500).json({ message: error.message }); 
    }
};

exports.approveRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, comment } = req.body;
        await approvalService.process(id, user_id, 'approved', comment);
        return res.json({ message: 'Request approved successfully' });
    } catch (error) { res.status(400).json({ message: error.message }); }
};

exports.rejectRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, comment } = req.body;
        await approvalService.process(id, user_id, 'rejected', comment);
        return res.json({ message: 'Request rejected successfully' });
    } catch (error) { res.status(400).json({ message: error.message }); }
};

exports.getPendingCounts = async (req, res) => {
    try {
        const userId = req.user?.id || req.query.user_id;
        
        if (!userId) {
            return res.json({});
        }

        const query = `
            SELECT t.approval_code, COUNT(*) as count
            FROM approval_request_logs al
            JOIN approval_requests ar ON al.approval_request_id = ar.id
            JOIN approval_types t ON ar.approval_types_id = t.id
            WHERE al.user_id = ?
            AND al.action = "assigned"
            AND al.level = ar.current_level
            AND ar.status = "pending"
            GROUP BY t.approval_code
        `;

        const [rows] = await db.execute(query, [userId]);

        const counts = {
            'Master Budget': 0,
            'Purchase Request': 0,
            'Target Sales': 0,
            'Product Request': 0,
            'Over Budget': 0,
            'Total': 0
        };

        rows.forEach(row => {
            const code = row.approval_code;
            let countVal = parseInt(row.count);

            if (code === 'Budget') {
                counts['Master Budget'] += countVal;
            } else if (code === 'PR') {
                counts['Purchase Request'] += countVal;
            } else if (code === 'Sales') {
                counts['Target Sales'] += countVal;
            } else if (code === 'Product') {
                counts['Product Request'] += countVal;
            } else if (code === 'OB') {
                counts['Over Budget'] += countVal;
            }
            counts['Total'] += countVal;
        });

        return res.json(counts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId || req.query.user_id || 1;
        const notifications = [];

        // 0. Fetch all active Approval Rules & Types dynamically from database
        const [dbRules] = await db.execute(`
            SELECT ar.id as rule_id, ar.rule_name as rule_name, t.id as type_id, t.approval_name, t.approval_code
            FROM approval_rules ar
            JOIN approval_types t ON ar.approval_types_id = t.id
            WHERE ar.is_active = 1
            ORDER BY ar.id DESC
        `);

        const [allTypes] = await db.execute(`SELECT id, approval_name, approval_code FROM approval_types`);

        // 1. PERSETUJUAN: Pending approval requests assigned to current user
        const persetujuanQuery = `
            SELECT ar.*, t.approval_name, t.approval_code, u.name as creator_name,
                   al.created_at as assigned_at, al.level as assigned_level
            FROM approval_request_logs al
            JOIN approval_requests ar ON al.approval_request_id = ar.id
            LEFT JOIN approval_types t ON ar.approval_types_id = t.id
            LEFT JOIN users u ON ar.created_by = u.id
            WHERE al.user_id = ?
            AND al.action = "assigned"
            AND al.level = ar.current_level
            AND ar.status = "pending"
            ORDER BY al.created_at DESC
        `;
        const [persetujuanRows] = await db.execute(persetujuanQuery, [userId]);

        for (const row of persetujuanRows) {
            let refName = '';
            try {
                const tableMap = {
                    'Modules\\Budget\\Entities\\MasterBudget': { table: 'master_budget', col: 'no_budgeting' },
                    'Master Budget': { table: 'master_budget', col: 'no_budgeting' },
                    'Modules\\Purchase\\Entities\\Purchase': { table: 'purchases', col: 'reference' },
                    'Purchase Request': { table: 'purchases', col: 'reference' },
                    'Over Budget': { table: 'purchases', col: 'reference' },
                    'Modules\\TargetSale\\Entities\\TargetSale': { table: 'target_sales', col: 'reference' },
                    'Target Sales': { table: 'target_sales', col: 'reference' },
                    'Modules\\Product\\Entities\\ProductRequest': { table: 'product_requests', col: 'request_number' },
                    'Product Request': { table: 'product_requests', col: 'request_number' },
                    'Modules\\MRP\\Entities\\MRP': { table: 'mrps', col: 'mrp_number' },
                    'MRP': { table: 'mrps', col: 'mrp_number' },
                };
                const cfg = tableMap[row.requestable_type];
                if (cfg) {
                    const [src] = await db.execute(`SELECT * FROM ${cfg.table} WHERE id = ?`, [row.requestable_id]);
                    if (src.length > 0) {
                        refName = src[0][cfg.col] || src[0].reference || src[0].code || src[0].id;
                    }
                }
            } catch (err) {
                console.error('Err fetching refName:', err);
            }

            const typeLabel = row.approval_name || 'Dokumen';
            const detailStr = refName ? `${typeLabel} (${refName})` : typeLabel;

            notifications.push({
                id: `persetujuan_${row.id}`,
                request_id: row.id,
                category: 'persetujuan',
                title: `1 Data ${detailStr} menunggu approval anda`,
                status: 'pending',
                icon: 'clock',
                created_at: row.assigned_at || row.updated_at || row.created_at,
                approval_name: row.approval_name,
                creator_name: row.creator_name || 'System'
            });
        }

        // 2. PENGAJUAN: Approval requests created by current user
        const pengajuanQuery = `
            SELECT ar.*, t.approval_name, t.approval_code
            FROM approval_requests ar
            LEFT JOIN approval_types t ON ar.approval_types_id = t.id
            WHERE ar.created_by = ?
            ORDER BY ar.updated_at DESC
            LIMIT 30
        `;
        const [pengajuanRows] = await db.execute(pengajuanQuery, [userId]);

        for (const row of pengajuanRows) {
            let refName = '';
            try {
                const tableMap = {
                    'Modules\\Budget\\Entities\\MasterBudget': { table: 'master_budget', col: 'no_budgeting' },
                    'Master Budget': { table: 'master_budget', col: 'no_budgeting' },
                    'Modules\\Purchase\\Entities\\Purchase': { table: 'purchases', col: 'reference' },
                    'Purchase Request': { table: 'purchases', col: 'reference' },
                    'Over Budget': { table: 'purchases', col: 'reference' },
                    'Modules\\TargetSale\\Entities\\TargetSale': { table: 'target_sales', col: 'reference' },
                    'Target Sales': { table: 'target_sales', col: 'reference' },
                    'Modules\\Product\\Entities\\ProductRequest': { table: 'product_requests', col: 'request_number' },
                    'Product Request': { table: 'product_requests', col: 'request_number' },
                    'Modules\\MRP\\Entities\\MRP': { table: 'mrps', col: 'mrp_number' },
                    'MRP': { table: 'mrps', col: 'mrp_number' },
                };
                const cfg = tableMap[row.requestable_type];
                if (cfg) {
                    const [src] = await db.execute(`SELECT * FROM ${cfg.table} WHERE id = ?`, [row.requestable_id]);
                    if (src.length > 0) {
                        refName = src[0][cfg.col] || src[0].reference || src[0].code || src[0].id;
                    }
                }
            } catch (err) {}

            const typeLabel = row.approval_name || 'Dokumen';
            const detailStr = refName ? `${typeLabel}: ${refName}` : typeLabel;

            if (row.status === 'pending') {
                const [approverLog] = await db.execute(`
                    SELECT al.*, u.name as approver_name
                    FROM approval_request_logs al
                    LEFT JOIN users u ON al.user_id = u.id
                    WHERE al.approval_request_id = ? AND al.level = ? AND al.action = "assigned"
                    LIMIT 1
                `, [row.id, row.current_level]);

                const approverName = approverLog.length > 0 ? approverLog[0].approver_name : 'Approver';
                notifications.push({
                    id: `pengajuan_${row.id}`,
                    request_id: row.id,
                    category: 'pengajuan',
                    title: `1 Data ${typeLabel} yang anda ajukan belum di approve oleh ${approverName} (level ${row.current_level})`,
                    status: 'pending',
                    icon: 'clock',
                    created_at: row.updated_at || row.created_at,
                    approval_name: row.approval_name
                });
            } else if (row.status === 'approved') {
                const [apprLog] = await db.execute(`
                    SELECT al.*, u.name as approver_name
                    FROM approval_request_logs al
                    LEFT JOIN users u ON al.user_id = u.id
                    WHERE al.approval_request_id = ? AND al.action = "approved"
                    ORDER BY al.id DESC LIMIT 1
                `, [row.id]);
                const approverName = apprLog.length > 0 ? apprLog[0].approver_name : 'System';
                const levelNum = apprLog.length > 0 ? apprLog[0].level : row.current_level;

                notifications.push({
                    id: `pengajuan_${row.id}`,
                    request_id: row.id,
                    category: 'pengajuan',
                    title: `${approverName} (Level ${levelNum}) Mengapprove ${detailStr}`,
                    status: 'approved',
                    icon: 'check',
                    created_at: row.updated_at || row.created_at,
                    approval_name: row.approval_name
                });
            } else if (row.status === 'rejected') {
                const [rejLog] = await db.execute(`
                    SELECT al.*, u.name as approver_name
                    FROM approval_request_logs al
                    LEFT JOIN users u ON al.user_id = u.id
                    WHERE al.approval_request_id = ? AND al.action = "rejected"
                    ORDER BY al.id DESC LIMIT 1
                `, [row.id]);
                const approverName = rejLog.length > 0 ? rejLog[0].approver_name : 'System';
                const levelNum = rejLog.length > 0 ? rejLog[0].level : row.current_level;

                notifications.push({
                    id: `pengajuan_${row.id}`,
                    request_id: row.id,
                    category: 'pengajuan',
                    title: `${approverName} (Level ${levelNum}) Menolak ${detailStr}`,
                    status: 'rejected',
                    icon: 'x',
                    created_at: row.updated_at || row.created_at,
                    approval_name: row.approval_name
                });
            }
        }

        // Dynamically add summary items for all ACTIVE Approval Rules in database
        const [pendingCounts] = await db.execute(`
            SELECT t.approval_name, COUNT(*) as count
            FROM approval_request_logs al
            JOIN approval_requests ar ON al.approval_request_id = ar.id
            JOIN approval_types t ON ar.approval_types_id = t.id
            WHERE al.user_id = ?
            AND al.action = "assigned"
            AND al.level = ar.current_level
            AND ar.status = "pending"
            GROUP BY t.id, t.approval_name
        `, [userId]);

        // Use dynamic rules list from database
        const dynamicCategories = dbRules.length > 0 ? dbRules.map(r => ({ name: r.approval_name, rule_name: r.rule_name })) : allTypes.map(t => ({ name: t.approval_name, rule_name: t.approval_name }));

        // Deduplicate by category name
        const uniqueCategories = [];
        const seenNames = new Set();
        for (const cat of dynamicCategories) {
            if (!seenNames.has(cat.name)) {
                seenNames.add(cat.name);
                uniqueCategories.push(cat);
            }
        }

        if (persetujuanRows.length === 0) {
            uniqueCategories.forEach((cat, idx) => {
                const found = pendingCounts.find(t => t.approval_name === cat.name);
                const count = found ? parseInt(found.count) : 0;
                notifications.push({
                    id: `summary_${idx}`,
                    request_id: 0,
                    category: 'persetujuan',
                    title: count > 0 
                        ? `${count} Data ${cat.name} (${cat.rule_name || cat.name}) menunggu approval anda`
                        : `Sistem Approval ${cat.name} aktif — Tidak ada permohonan tertunda`,
                    status: count > 0 ? 'pending' : 'approved',
                    icon: count > 0 ? 'clock' : 'check',
                    created_at: new Date().toISOString(),
                    approval_name: cat.name
                });
            });
        }

        notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        const counts = {
            total: notifications.length,
            persetujuan: notifications.filter(n => n.category === 'persetujuan').length,
            pengajuan: notifications.filter(n => n.category === 'pengajuan').length
        };

        const activeApprovalTypes = Array.from(seenNames);

        return res.json({ notifications: serialize(notifications), counts, approval_types: activeApprovalTypes });

    } catch (error) {
        console.error('getNotifications error:', error);
        res.status(500).json({ message: error.message });
    }
};




// ─── Approval Rules CRUD ───────────────────────────────────────────────────

exports.createApprovalRule = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { approval_types_id, name, is_active, levels } = req.body;

        const [result] = await connection.execute(
            'INSERT INTO approval_rules (approval_types_id, name, is_active, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
            [approval_types_id, name, is_active ? 1 : 0]
        );
        const ruleId = result.insertId;

        if (levels && levels.length > 0) {
            for (const level of levels) {
                const [lvlResult] = await connection.execute(
                    'INSERT INTO approval_rule_levels (approval_rules_id, level, amount_limit, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
                    [ruleId, level.level, level.amount_limit || 9999999999]
                );
                const levelId = lvlResult.insertId;

                if (level.users && level.users.length > 0) {
                    for (const user of level.users) {
                        await connection.execute(
                            'INSERT INTO approval_rule_users (approval_rule_levels_id, user_id, role, sequence, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
                            [levelId, user.user_id, user.role, user.sequence || 1]
                        );
                    }
                }
            }
        }

        await connection.commit();
        return res.status(201).json({ message: 'Approval rule created', id: ruleId });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: error.message });
    } finally { connection.release(); }
};

exports.updateApprovalRule = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const { approval_types_id, name, is_active, levels } = req.body;

        await connection.execute(
            'UPDATE approval_rules SET approval_types_id = ?, name = ?, is_active = ?, updated_at = NOW() WHERE id = ?',
            [approval_types_id, name, is_active ? 1 : 0, id]
        );

        // Delete existing levels and users, then re-insert
        const [existingLevels] = await connection.execute('SELECT id FROM approval_rule_levels WHERE approval_rules_id = ?', [id]);
        for (const lvl of existingLevels) {
            await connection.execute('DELETE FROM approval_rule_users WHERE approval_rule_levels_id = ?', [lvl.id]);
        }
        await connection.execute('DELETE FROM approval_rule_levels WHERE approval_rules_id = ?', [id]);

        if (levels && levels.length > 0) {
            for (const level of levels) {
                const [lvlResult] = await connection.execute(
                    'INSERT INTO approval_rule_levels (approval_rules_id, level, amount_limit, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
                    [id, level.level, level.amount_limit || 9999999999]
                );
                const levelId = lvlResult.insertId;

                if (level.users && level.users.length > 0) {
                    for (const user of level.users) {
                        await connection.execute(
                            'INSERT INTO approval_rule_users (approval_rule_levels_id, user_id, role, sequence, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
                            [levelId, user.user_id, user.role, user.sequence || 1]
                        );
                    }
                }
            }
        }

        await connection.commit();
        return res.json({ message: 'Approval rule updated' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: error.message });
    } finally { connection.release(); }
};

exports.deleteApprovalRule = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;

        const [existingLevels] = await connection.execute('SELECT id FROM approval_rule_levels WHERE approval_rules_id = ?', [id]);
        for (const lvl of existingLevels) {
            await connection.execute('DELETE FROM approval_rule_users WHERE approval_rule_levels_id = ?', [lvl.id]);
        }
        await connection.execute('DELETE FROM approval_rule_levels WHERE approval_rules_id = ?', [id]);
        await connection.execute('DELETE FROM approval_rules WHERE id = ?', [id]);

        await connection.commit();
        return res.json({ message: 'Approval rule deleted' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: error.message });
    } finally { connection.release(); }
};
