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

            if (!startingLevel) {
                if (isInternalConn) await connection.commit();
                return { id: null, status: 'none' };
            }

            const targetSequence = requesterRule.sequence;

            // 4. Find Approvers at the same level and sequence
            const [approvers] = await connection.execute(
                'SELECT * FROM approval_rule_users WHERE approval_rule_levels_id = ? AND role = "approver" AND sequence = ?',
                [startingLevel.id, targetSequence]
            );

            if (approvers.length === 0) {
                if (isInternalConn) await connection.commit();
                return { id: null, status: 'none' };
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
}

module.exports = new ApprovalService();
