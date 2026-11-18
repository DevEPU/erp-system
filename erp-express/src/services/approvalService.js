const db = require('../config/db');

class ApprovalService {
    /**
     * Replicates Laravel's ApprovalEngine::createRequest
     */
    async createRequest(modelClass, modelId, approvalTypesId, amount, requestedBy, providedConnection = null) {
        let connection = providedConnection;
        let isInternalConn = false;

        if (!connection) {
            connection = await db.getConnection();
            await connection.beginTransaction();
            isInternalConn = true;
        }

        try {
            // 1. Find Active Rule
            const [rules] = await connection.execute(
                'SELECT * FROM approval_rules WHERE approval_types_id = ? AND is_active = 1 LIMIT 1',
                [approvalTypesId]
            );

            if (rules.length === 0) {
                if (isInternalConn) await connection.commit();
                return { id: null, status: 'none' };
            }

            const activeRule = rules[0];

            // 2. Find Candidate Levels (amount_limit >= amount)
            const [levels] = await connection.execute(
                'SELECT * FROM approval_rule_levels WHERE approval_rules_id = ? AND amount_limit >= ? ORDER BY level ASC',
                [activeRule.id, amount]
            );

            if (levels.length === 0) {
                if (isInternalConn) await connection.commit();
                return { id: null, status: 'none' };
            }

            let startingLevel = null;
            let requesterRule = null;

            // 3. Find Starting Level where user is a requester
            for (const level of levels) {
                const [userRules] = await connection.execute(
                    'SELECT * FROM approval_rule_users WHERE approval_rule_levels_id = ? AND role = "requester" AND user_id = ? LIMIT 1',
                    [level.id, requestedBy]
                );
                if (userRules.length > 0) {
                    startingLevel = level;
                    requesterRule = userRules[0];
                    break;
                }
            }

            if (!startingLevel && levels.length > 0) {
                startingLevel = levels[0];
                const [anyReq] = await connection.execute(
                    'SELECT * FROM approval_rule_users WHERE approval_rule_levels_id = ? AND role = "requester" LIMIT 1',
                    [startingLevel.id]
                );
                requesterRule = anyReq.length > 0 ? anyReq[0] : { sequence: 0 };
            }

            if (!startingLevel) {
                if (isInternalConn) await connection.commit();
                return { id: null, status: 'none' };
            }

            const targetSequence = requesterRule ? requesterRule.sequence : 0;

            // 4. Find Approvers at the same level and sequence
            let [approvers] = await connection.execute(
                'SELECT * FROM approval_rule_users WHERE approval_rule_levels_id = ? AND role = "approver" AND sequence = ?',
                [startingLevel.id, targetSequence]
            );

            if (approvers.length === 0) {
                // Fallback to any approvers at this level
                const [anyApprovers] = await connection.execute(
                    'SELECT * FROM approval_rule_users WHERE approval_rule_levels_id = ? AND role = "approver"',
                    [startingLevel.id]
                );
                if (anyApprovers.length > 0) {
                    approvers = anyApprovers;
                } else {
                    if (isInternalConn) await connection.commit();
                    return { id: null, status: 'none' };
                }
            }

            // 5. Create Approval Request
            const [reqResult] = await connection.execute(
                `INSERT INTO approval_requests SET 
                    approval_types_id = ?, 
                    approval_rules_id = ?, 
                    requestable_type = ?, 
                    requestable_id = ?, 
                    created_by = ?, 
                    amount = ?, 
                    status = ?, 
                    current_level = ?, 
                    created_at = NOW(), 
                    updated_at = NOW()`,
                [approvalTypesId, activeRule.id, modelClass, modelId, requestedBy, amount, 'pending', startingLevel.level]
            );
            const requestId = reqResult.insertId;

            // 6. Create Assignment Logs
            for (const approver of approvers) {
                await connection.execute(
                    `INSERT INTO approval_request_logs SET 
                        approval_request_id = ?, 
                        level = ?, 
                        user_id = ?, 
                        action = ?, 
                        created_at = NOW(), 
                        updated_at = NOW()`,
                    [requestId, startingLevel.level, approver.user_id, 'assigned']
                );
            }

            if (isInternalConn) await connection.commit();
            return { id: requestId, status: 'pending', current_level: startingLevel.level };

        } catch (error) {
            if (isInternalConn) await connection.rollback();
            throw error;
        } finally {
            if (isInternalConn) connection.release();
        }
    }

    async createAutoApprovedRequest(connection, modelClass, modelId, approvalTypesId, amount, requestedBy) {
        const [result] = await connection.execute(
            `INSERT INTO approval_requests SET 
                approval_types_id = ?, 
                requestable_type = ?, 
                requestable_id = ?, 
                created_by = ?, 
                amount = ?, 
                status = ?, 
                current_level = 0, 
                created_at = NOW(), 
                updated_at = NOW()`,
            [approvalTypesId, modelClass, modelId, requestedBy, amount, 'approved']
        );
        const requestId = result.insertId;
        
        await this.syncStatusToSource(connection, modelClass, modelId, 'approved');
        return { id: requestId, status: 'approved', current_level: 0 };
    }

    async process(requestId, userId, action, note = null, providedConnection = null) {
        let connection = providedConnection;
        let isInternalConn = false;

        if (!connection) {
            connection = await db.getConnection();
            await connection.beginTransaction();
            isInternalConn = true;
        }

        try {
            const [requests] = await connection.execute('SELECT * FROM approval_requests WHERE id = ?', [requestId]);
            if (requests.length === 0) throw new Error('Approval request not found');
            const approvalRequest = requests[0];

            // 1. Find assigned log for this user at current level
            const [logs] = await connection.execute(
                'SELECT * FROM approval_request_logs WHERE approval_request_id = ? AND user_id = ? AND level = ? AND action = "assigned" LIMIT 1',
                [requestId, userId, approvalRequest.current_level]
            );

            if (logs.length === 0) {
                throw new Error('Not authorized or already processed.');
            }

            const currentLog = logs[0];

            // 2. Update log
            await connection.execute(
                'UPDATE approval_request_logs SET action = ?, comment = ?, updated_at = NOW() WHERE id = ?',
                [action, note, currentLog.id]
            );

            if (action === 'rejected') {
                await connection.execute('UPDATE approval_requests SET status = "rejected", updated_at = NOW() WHERE id = ?', [requestId]);
                await this.syncStatusToSource(connection, approvalRequest.requestable_type, approvalRequest.requestable_id, 'rejected');
                await connection.commit();
                return { status: 'rejected' };
            }

            // 3. Check if more approvers at this level
            const [pendingLogs] = await connection.execute(
                'SELECT COUNT(*) as count FROM approval_request_logs WHERE approval_request_id = ? AND level = ? AND action = "assigned"',
                [requestId, approvalRequest.current_level]
            );

            if (pendingLogs[0].count === 0) {
                // Find next level
                const [higherLevels] = await connection.execute(
                    'SELECT * FROM approval_rule_levels WHERE approval_rules_id = ? AND level > ? ORDER BY level ASC',
                    [approvalRequest.approval_rules_id, approvalRequest.current_level]
                );

                let foundNextLevel = false;

                for (const nextLevelData of higherLevels) {
                    // Find requester in this level to get sequence
                    const [reqAtLevel] = await connection.execute(
                        'SELECT * FROM approval_rule_users WHERE approval_rule_levels_id = ? AND role = "requester" AND user_id = ? LIMIT 1',
                        [nextLevelData.id, approvalRequest.created_by]
                    );

                    if (reqAtLevel.length === 0) continue;

                    const targetSequence = reqAtLevel[0].sequence;

                    const [nextApprovers] = await connection.execute(
                        'SELECT * FROM approval_rule_users WHERE approval_rule_levels_id = ? AND role = "approver" AND sequence = ?',
                        [nextLevelData.id, targetSequence]
                    );

                    if (nextApprovers.length > 0) {
                        for (const nextUser of nextApprovers) {
                            await connection.execute(
                                'INSERT INTO approval_request_logs (approval_request_id, level, user_id, action, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
                                [requestId, nextLevelData.level, nextUser.user_id, 'assigned']
                            );
                        }
                        await connection.execute('UPDATE approval_requests SET current_level = ?, updated_at = NOW() WHERE id = ?', [nextLevelData.level, requestId]);
                        foundNextLevel = true;
                        break;
                    }
                }

                if (!foundNextLevel) {
                    await connection.execute('UPDATE approval_requests SET status = "approved", updated_at = NOW() WHERE id = ?', [requestId]);
                    await this.syncStatusToSource(connection, approvalRequest.requestable_type, approvalRequest.requestable_id, 'approved');
                }
            }

            if (isInternalConn) await connection.commit();
            return { status: 'processed' };

        } catch (error) {
            if (isInternalConn) await connection.rollback();
            throw error;
        } finally {
            if (isInternalConn) connection.release();
        }
    }

    async syncStatusToSource(connection, modelClass, modelId, status) {
        const tableMap = {
            'Modules\\Budget\\Entities\\MasterBudget': 'master_budget',
            'Master Budget': 'master_budget',
            'Modules\\Purchase\\Entities\\Purchase': 'purchases',
            'Purchase Request': 'purchases',
            'Over Budget': 'purchases',
            'Modules\\TargetSale\\Entities\\TargetSale': 'target_sales',
            'Target Sales': 'target_sales',
            'Modules\\Product\\Entities\\ProductRequest': 'product_requests',
            'Product Request': 'product_requests',
            'Modules\\Product\\Entities\\ProductChangeRequest': 'product_change_requests',
            'Perubahan Master Data Inventory': 'product_change_requests',
            'Product Change Request': 'product_change_requests',
            'Modules\\PurchaseOrder\\Entities\\PurchaseOrder': 'purchase_orders',
            'Purchase Order': 'purchase_orders',
            'Customer Forecast': 'customer_forecasts',
            'Modules\\Sales\\Entities\\CustomerForecast': 'customer_forecasts',
            'Customer PO': 'customer_po',
            'Modules\\Sales\\Entities\\CustomerPO': 'customer_po',
            'Modules\\MRP\\Entities\\MRP': 'mrps',
            'MRP': 'mrps'
        };

        const tableName = tableMap[modelClass];
        if (!tableName) return;

        let dbStatus = 'None';
        if (status === 'approved') dbStatus = 'Approved';
        else if (status === 'rejected') dbStatus = 'Rejected';
        else if (status === 'pending') dbStatus = 'Waiting for Approval';
        else if (status === 'none') dbStatus = 'None';

        await connection.execute(`UPDATE ${tableName} SET status = ? WHERE id = ?`, [dbStatus, modelId]);

        // Specific Logic for Purchase Request
        if (tableName === 'purchases') {
            if (status === 'approved') {
                await this.applyBudgetAllocations(connection, modelId);
            } else if (status === 'rejected') {
                await this.rollbackBudgetAllocations(connection, modelId);
            }
        }

        // Specific Logic for MRP: Auto fill schedule when MRP is approved and enable_mrp_release_pr is disabled (0)
        if (tableName === 'mrps') {
            if (status === 'approved') {
                await this.handleMRPApprovedAutoSchedule(connection, modelId);
            }
        }

        // Specific Logic for Product Change Requests (Perubahan Master Data Inventory)
        if (tableName === 'product_change_requests') {
            if (status === 'approved') {
                await this.applyProductChange(connection, modelId);
            }
        }
    }

    async applyProductChange(connection, changeRequestId) {
        try {
            const [rows] = await connection.execute('SELECT * FROM product_change_requests WHERE id = ?', [changeRequestId]);
            if (rows.length === 0) return;
            const changeReq = rows[0];
            const productId = changeReq.product_id;
            if (!productId) return;

            let changeData = {};
            try {
                changeData = typeof changeReq.change_data === 'string' ? JSON.parse(changeReq.change_data) : (changeReq.change_data || {});
            } catch (e) {
                console.error('Error parsing change_data in applyProductChange:', e);
                return;
            }

            let { 
                product_code, product_name, category_id, product_unit, product_price, 
                supplier_id, is_asset, is_mandatory, product_note, min_qty, max_qty, min_order, pcs_per_pack,
                product_type, bom_code, units, locations, part_number, tax_item_code,
                brand, barcode, hsn_sat_code, purchase_price, weight_kg, volume_m3,
                shelf_life_days, lead_time_days, valuation_method, product_suppliers
            } = changeData;

            if (product_code === "" || (typeof product_code === 'string' && product_code.trim() === "")) {
                product_code = null;
            }

            if (units && units.length > 0 && units[0].unit_code) {
                product_unit = units[0].unit_code;
                product_price = units[0].buy_price;
            }

            await connection.execute(
                `UPDATE products SET 
                    product_code = COALESCE(?, product_code),
                    product_name = COALESCE(?, product_name),
                    category_id = COALESCE(?, category_id),
                    product_unit = COALESCE(?, product_unit),
                    product_price = COALESCE(?, product_price),
                    supplier_id = ?,
                    is_asset = COALESCE(?, is_asset),
                    is_mandatory = COALESCE(?, is_mandatory),
                    product_note = ?,
                    min_qty = COALESCE(?, min_qty),
                    max_qty = COALESCE(?, max_qty),
                    min_order = COALESCE(?, min_order),
                    pcs_per_pack = COALESCE(?, pcs_per_pack),
                    product_type = COALESCE(?, product_type),
                    bom_code = ?,
                    part_number = ?,
                    tax_item_code = ?,
                    brand = ?,
                    barcode = ?,
                    hsn_sat_code = ?,
                    purchase_price = COALESCE(?, purchase_price),
                    weight_kg = COALESCE(?, weight_kg),
                    volume_m3 = COALESCE(?, volume_m3),
                    shelf_life_days = COALESCE(?, shelf_life_days),
                    lead_time_days = COALESCE(?, lead_time_days),
                    valuation_method = COALESCE(?, valuation_method),
                    updated_at = NOW()
                WHERE id = ?`,
                [
                    product_code !== undefined ? product_code : null,
                    product_name !== undefined ? product_name : null,
                    category_id !== undefined ? category_id : null,
                    product_unit !== undefined ? product_unit : null,
                    product_price !== undefined ? product_price : null,
                    supplier_id || null,
                    is_asset !== undefined ? (is_asset ? 1 : 0) : null,
                    is_mandatory !== undefined ? (is_mandatory ? 1 : 0) : null,
                    product_note || null,
                    min_qty !== undefined ? min_qty : null,
                    max_qty !== undefined ? max_qty : null,
                    min_order !== undefined ? min_order : null,
                    pcs_per_pack !== undefined ? pcs_per_pack : null,
                    product_type || null,
                    bom_code || null,
                    part_number || null,
                    tax_item_code || null,
                    brand || null,
                    barcode || null,
                    hsn_sat_code || null,
                    purchase_price !== undefined ? purchase_price : null,
                    weight_kg !== undefined ? weight_kg : null,
                    volume_m3 !== undefined ? volume_m3 : null,
                    shelf_life_days !== undefined ? shelf_life_days : null,
                    lead_time_days !== undefined ? lead_time_days : null,
                    valuation_method || 'AVCO',
                    productId
                ]
            );

            // Sync Units if provided
            if (units && Array.isArray(units)) {
                await connection.execute('DELETE FROM product_units WHERE product_id = ?', [productId]);
                for (const unit of units) {
                    if (unit.unit_code) {
                        await connection.execute(
                            'INSERT INTO product_units (product_id, level, barcode, unit_code, tax_unit, conversion_qty, color, buy_price, sell_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                            [productId, unit.level, unit.barcode || null, unit.unit_code, unit.tax_unit || null, unit.conversion_qty || 0, unit.color || null, unit.buy_price || 0, unit.sell_price || 0]
                        );
                    }
                }
            }

            // Sync Locations if provided
            if (locations && Array.isArray(locations)) {
                await connection.execute('DELETE FROM product_locations WHERE product_id = ?', [productId]);
                for (const loc of locations) {
                    if (loc.warehouse_id) {
                        await connection.execute(
                            'INSERT INTO product_locations (product_id, warehouse_id, aisle, min_qty, max_qty) VALUES (?, ?, ?, ?, ?)',
                            [productId, loc.warehouse_id, loc.aisle || null, loc.min_qty || 0, loc.max_qty || 0]
                        );
                    }
                }
            }

            // Sync Suppliers if provided
            if (product_suppliers && Array.isArray(product_suppliers)) {
                await connection.execute('DELETE FROM product_suppliers WHERE product_id = ?', [productId]);
                for (const ps of product_suppliers) {
                    if (ps.supplier_id) {
                        await connection.execute(
                            `INSERT INTO product_suppliers (product_id, supplier_id, supplier_part_number, purchase_price, sell_price, min_qty, max_qty, min_order, allocation_percent, pcs_per_pack, is_primary, units_json) 
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                productId,
                                ps.supplier_id,
                                ps.supplier_part_number || null,
                                ps.purchase_price || 0,
                                ps.sell_price || 0,
                                ps.min_qty || 0,
                                ps.max_qty || 0,
                                ps.min_order || 0,
                                ps.allocation_percent || 0,
                                ps.pcs_per_pack || 1,
                                ps.is_primary ? 1 : 0,
                                ps.units_json || null
                            ]
                        );
                    }
                }
            }
        } catch (error) {
            console.error('applyProductChange Error:', error);
            throw error;
        }
    }

    async applyBudgetAllocations(connection, purchaseId) {
        // Find unapplied allocations
        const [allocs] = await connection.execute(
            'SELECT * FROM purchase_budget_allocations WHERE purchase_id = ? AND is_applied = 0',
            [purchaseId]
        );

        for (const alloc of allocs) {
            // 1. Update Master Budget
            if (alloc.source_master_budget_id) {
                await connection.execute(
                    'UPDATE master_budget SET used_amount = used_amount + ? WHERE id = ?',
                    [alloc.amount, alloc.source_master_budget_id]
                );
            }
            // 2. Update Budget Detail
            if (alloc.source_budget_detail_id) {
                await connection.execute(
                    'UPDATE budget_details SET used_amount = used_amount + ? WHERE id = ?',
                    [alloc.amount, alloc.source_budget_detail_id]
                );
            }
            // 3. Mark as Applied
            await connection.execute(
                'UPDATE purchase_budget_allocations SET is_applied = 1 WHERE id = ?',
                [alloc.id]
            );
        }
    }

    async rollbackBudgetAllocations(connection, purchaseId) {
        // Find applied allocations
        const [allocs] = await connection.execute(
            'SELECT * FROM purchase_budget_allocations WHERE purchase_id = ? AND is_applied = 1',
            [purchaseId]
        );

        for (const alloc of allocs) {
            // 1. Rollback Master Budget
            if (alloc.source_master_budget_id) {
                await connection.execute(
                    'UPDATE master_budget SET used_amount = used_amount - ? WHERE id = ?',
                    [alloc.amount, alloc.source_master_budget_id]
                );
            }
            // 2. Rollback Budget Detail
            if (alloc.source_budget_detail_id) {
                await connection.execute(
                    'UPDATE budget_details SET used_amount = used_amount - ? WHERE id = ?',
                    [alloc.amount, alloc.source_budget_detail_id]
                );
            }
            // 3. Mark as Unapplied
            await connection.execute(
                'UPDATE purchase_budget_allocations SET is_applied = 0 WHERE id = ?',
                [alloc.id]
            );
        }
    }

    async handleMRPApprovedAutoSchedule(connection, mrpId) {
        // 1. Check setting enable_mrp_release_pr
        const [settings] = await connection.execute('SELECT enable_mrp_release_pr FROM settings LIMIT 1');
        const isReleasePREnabled = settings.length > 0 ? Boolean(settings[0].enable_mrp_release_pr) : false;

        // If enable_mrp_release_pr is disabled (0 / false / non-active):
        // Do NOT create PR. Only automatically populate / update vendor_daily_schedules!
        if (!isReleasePREnabled) {
            // Fetch MRP info
            const [mrpRows] = await connection.execute(
                'SELECT id, revision_number, time_frame_start FROM mrps WHERE id = ?',
                [mrpId]
            );
            if (mrpRows.length === 0) return;
            const mrp = mrpRows[0];
            const isRevision = mrp.revision_number && Number(mrp.revision_number) > 0;

            // Determine schedule date string & target month/year
            let targetDateStr;
            let targetMonth;
            let targetYear;
            if (mrp.time_frame_start) {
                const dt = new Date(mrp.time_frame_start);
                if (!isNaN(dt.getTime())) {
                    targetYear = dt.getFullYear();
                    targetMonth = dt.getMonth() + 1;
                    targetDateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
                }
            }
            if (!targetDateStr) {
                const today = new Date();
                targetYear = today.getFullYear();
                targetMonth = today.getMonth() + 1;
                targetDateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            }

            // Fetch mrp_details with product & supplier
            const [details] = await connection.execute(`
                SELECT md.id, md.product_id, md.mrp_qty, md.net_qty, md.ord_qty, md.qty_required,
                       COALESCE(md.supplier_id, p.supplier_id) as supplier_id
                FROM mrp_details md
                LEFT JOIN products p ON md.product_id = p.id
                WHERE md.mrp_id = ?
            `, [mrpId]);

            // Group by supplier_id and product_id
            const qtyMap = new Map();
            for (const item of details) {
                const supplierId = item.supplier_id;
                const productId = item.product_id;
                if (!supplierId || !productId) continue;

                const baseQty = Number(item.mrp_qty || item.net_qty || item.ord_qty || item.qty_required || 0);
                if (baseQty <= 0) continue;

                const key = `${supplierId}-${productId}`;
                if (!qtyMap.has(key)) {
                    qtyMap.set(key, { supplierId, productId, totalQty: 0, detailIds: [] });
                }
                const entry = qtyMap.get(key);
                entry.totalQty += baseQty;
                entry.detailIds.push({ id: item.id, qty: baseQty });
            }

            for (const entry of qtyMap.values()) {
                const { supplierId, productId, totalQty, detailIds } = entry;

                // Check if rows already exist for this supplier + product in the target month & year
                const [existingRows] = await connection.execute(
                    'SELECT id FROM vendor_daily_schedules WHERE supplier_id = ? AND product_id = ? AND MONTH(schedule_date) = ? AND YEAR(schedule_date) = ? LIMIT 1',
                    [supplierId, productId, targetMonth, targetYear]
                );

                if (existingRows.length > 0) {
                    if (isRevision) {
                        await connection.execute(
                            'UPDATE vendor_daily_schedules SET po_qty_2 = ?, updated_at = NOW() WHERE supplier_id = ? AND product_id = ? AND MONTH(schedule_date) = ? AND YEAR(schedule_date) = ?',
                            [totalQty, supplierId, productId, targetMonth, targetYear]
                        );
                    } else {
                        await connection.execute(
                            'UPDATE vendor_daily_schedules SET po_qty_1 = ?, updated_at = NOW() WHERE supplier_id = ? AND product_id = ? AND MONTH(schedule_date) = ? AND YEAR(schedule_date) = ?',
                            [totalQty, supplierId, productId, targetMonth, targetYear]
                        );
                    }
                } else {
                    if (isRevision) {
                        await connection.execute(
                            `INSERT INTO vendor_daily_schedules (supplier_id, product_id, po_qty_1, po_qty_2, schedule_date, schedule_qty, updated_at)
                             VALUES (?, ?, 0, ?, ?, 0, NOW())
                             ON DUPLICATE KEY UPDATE po_qty_2 = VALUES(po_qty_2), updated_at = NOW()`,
                            [supplierId, productId, totalQty, targetDateStr]
                        );
                    } else {
                        await connection.execute(
                            `INSERT INTO vendor_daily_schedules (supplier_id, product_id, po_qty_1, po_qty_2, schedule_date, schedule_qty, updated_at)
                             VALUES (?, ?, ?, 0, ?, 0, NOW())
                             ON DUPLICATE KEY UPDATE po_qty_1 = VALUES(po_qty_1), updated_at = NOW()`,
                            [supplierId, productId, totalQty, targetDateStr]
                        );
                    }
                }

                // Update detail items: mark qty_released_pr and release_draft_percent
                for (const d of detailIds) {
                    await connection.execute(
                        'UPDATE mrp_details SET qty_released_pr = ?, release_draft_percent = 100, updated_at = NOW() WHERE id = ?',
                        [d.qty, d.id]
                    );
                }
            }
        }
    }
}

module.exports = new ApprovalService();
