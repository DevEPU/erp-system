const db = require('../src/config/db');

async function setupMRPApproval() {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        console.log('--- Setting up MRP Approval Rules ---');

        // 1. Check or Create Approval Type 'MRP'
        let [types] = await connection.execute("SELECT * FROM approval_types WHERE approval_name = 'MRP' OR approval_code = 'MRP'");
        let typeId;
        if (types.length === 0) {
            const [typeRes] = await connection.execute(
                "INSERT INTO approval_types (approval_code, approval_name, created_at, updated_at) VALUES ('MRP', 'MRP', NOW(), NOW())"
            );
            typeId = typeRes.insertId;
            console.log(`Created approval_types 'MRP' with ID: ${typeId}`);
        } else {
            typeId = types[0].id;
            console.log(`Found existing approval_types 'MRP' with ID: ${typeId}`);
        }

        // 2. Check or Create Approval Rule for MRP
        let [rules] = await connection.execute("SELECT * FROM approval_rules WHERE approval_types_id = ?", [typeId]);
        let ruleId;
        if (rules.length === 0) {
            const [ruleRes] = await connection.execute(
                "INSERT INTO approval_rules (approval_types_id, rule_name, is_active, created_at, updated_at) VALUES (?, 'MRP Approval Rule', 1, NOW(), NOW())",
                [typeId]
            );
            ruleId = ruleRes.insertId;
            console.log(`Created approval_rules for MRP with ID: ${ruleId}`);
        } else {
            ruleId = rules[0].id;
            await connection.execute("UPDATE approval_rules SET is_active = 1, updated_at = NOW() WHERE id = ?", [ruleId]);
            console.log(`Found existing approval_rules for MRP with ID: ${ruleId}`);
        }

        // Clean up old levels for this rule to recreate cleanly
        const [oldLevels] = await connection.execute("SELECT id FROM approval_rule_levels WHERE approval_rules_id = ?", [ruleId]);
        for (const ol of oldLevels) {
            await connection.execute("DELETE FROM approval_rule_users WHERE approval_rule_levels_id = ?", [ol.id]);
        }
        await connection.execute("DELETE FROM approval_rule_levels WHERE approval_rules_id = ?", [ruleId]);

        // Get all user IDs to set as requesters
        const [allUsers] = await connection.execute("SELECT id FROM users");
        const requesterUserIds = allUsers.map(u => u.id);

        // Define 3 Approval Levels
        // Level 1: Bugie Wibowo Koesman (ID 13) - Diketahui
        // Level 2: S.B. Anang (ID 23) - Diperiksa
        // Level 3: Rony Purwantoro (ID 11) - Disetujui
        const levelsConfig = [
            { level: 1, approverId: 13, limit: 999999999999 },
            { level: 2, approverId: 23, limit: 999999999999 },
            { level: 3, approverId: 11, limit: 999999999999 }
        ];

        for (const cfg of levelsConfig) {
            const [lvlRes] = await connection.execute(
                "INSERT INTO approval_rule_levels (approval_rules_id, level, amount_limit, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, NOW(), NOW())",
                [ruleId, cfg.level, cfg.limit]
            );
            const levelId = lvlRes.insertId;

            // Add Approver
            await connection.execute(
                "INSERT INTO approval_rule_users (approval_rule_levels_id, user_id, role, sequence, is_active, created_at, updated_at) VALUES (?, ?, 'approver', 0, 1, NOW(), NOW())",
                [levelId, cfg.approverId]
            );

            // Add Requesters (all users can request MRP)
            for (const reqUserId of requesterUserIds) {
                await connection.execute(
                    "INSERT INTO approval_rule_users (approval_rule_levels_id, user_id, role, sequence, is_active, created_at, updated_at) VALUES (?, ?, 'requester', 0, 1, NOW(), NOW())",
                    [levelId, reqUserId]
                );
            }

            console.log(`Created Level ${cfg.level} (ID: ${levelId}) with Approver ID ${cfg.approverId}`);
        }

        await connection.commit();
        console.log('--- MRP Approval Rules Setup Successfully Completed! ---');
        process.exit(0);

    } catch (error) {
        await connection.rollback();
        console.error('Error setting up MRP Approval Rules:', error);
        process.exit(1);
    } finally {
        connection.release();
    }
}

setupMRPApproval();
