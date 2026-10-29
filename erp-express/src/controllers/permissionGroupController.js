const db = require('../config/db');

exports.getPermissionGroups = async (req, res) => {
    try {
        const [groups] = await db.query(`
            SELECT pg.*, 
            JSON_ARRAYAGG(
                JSON_OBJECT(
                    'id', p.id,
                    'name', p.name,
                    'guard_name', p.guard_name
                )
            ) as permissions
            FROM permission_groups pg
            LEFT JOIN permission_group_has_permissions pghp ON pg.id = pghp.permission_group_id
            LEFT JOIN permissions p ON pghp.permission_id = p.id
            GROUP BY pg.id
            ORDER BY pg.name ASC
        `);

        // Clean up JSON_ARRAYAGG result if it contains a null object (when no permissions)
        const sanitizedGroups = groups.map(g => ({
            ...g,
            permissions: (g.permissions && g.permissions[0]?.id !== null) ? g.permissions : []
        }));

        res.json({
            status: 'success',
            data: sanitizedGroups
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};

exports.createPermissionGroup = async (req, res) => {
    const { name, permissions } = req.body;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [result] = await connection.query(
            'INSERT INTO permission_groups (name, created_at, updated_at) VALUES (?, NOW(), NOW())',
            [name]
        );
        const groupId = result.insertId;

        if (permissions && permissions.length > 0) {
            const values = permissions.map(pId => [pId, groupId]);
            await connection.query(
                'INSERT INTO permission_group_has_permissions (permission_id, permission_group_id) VALUES ?',
                [values]
            );
        }

        await connection.commit();
        res.json({ status: 'success', message: 'Permission Group created successfully', data: { id: groupId } });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ status: 'error', message: error.message });
    } finally {
        connection.release();
    }
};

exports.updatePermissionGroup = async (req, res) => {
    const { id } = req.params;
    const { name, permissions } = req.body;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        await connection.query(
            'UPDATE permission_groups SET name = ?, updated_at = NOW() WHERE id = ?',
            [name, id]
        );

        // Update permissions: Delete old, Insert new
        await connection.query('DELETE FROM permission_group_has_permissions WHERE permission_group_id = ?', [id]);

        if (permissions && permissions.length > 0) {
            const values = permissions.map(pId => [pId, id]);
            await connection.query(
                'INSERT INTO permission_group_has_permissions (permission_id, permission_group_id) VALUES ?',
                [values]
            );
        }

        await connection.commit();
        res.json({ status: 'success', message: 'Permission Group updated successfully' });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ status: 'error', message: error.message });
    } finally {
        connection.release();
    }
};

exports.deletePermissionGroup = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM permission_groups WHERE id = ?', [id]);
        res.json({ status: 'success', message: 'Permission Group deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};
