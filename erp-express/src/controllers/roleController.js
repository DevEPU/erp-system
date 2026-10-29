const db = require('../config/db');

// Utility function for BigInt serialization
const serialize = (data) => JSON.parse(JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
));

exports.getRoles = async (req, res) => {
    try {
        const [roles] = await db.execute('SELECT * FROM roles WHERE name != "Super Admin" ORDER BY id DESC');
        
        // Fetch permissions for each role
        for (let role of roles) {
            const [perms] = await db.execute(
                'SELECT p.id, p.name FROM permissions p JOIN role_has_permissions rhp ON p.id = rhp.permission_id WHERE rhp.role_id = ?',
                [role.id]
            );
            role.permissions = perms;
        }

        return res.json({ data: serialize(roles) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

exports.getPermissions = async (req, res) => {
    try {
        const [permissions] = await db.execute('SELECT * FROM permissions');
        return res.json({ 
            data: serialize(permissions),
            count: permissions.length
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

exports.createRole = async (req, res) => {
    const { name, permissions } = req.body;
    try {
        const [result] = await db.execute('INSERT INTO roles (name, guard_name, created_at, updated_at) VALUES (?, "web", NOW(), NOW())', [name]);
        const roleId = result.insertId;

        if (permissions && Array.isArray(permissions)) {
            for (let permId of permissions) {
                await db.execute('INSERT INTO role_has_permissions (permission_id, role_id) VALUES (?, ?)', [permId, roleId]);
            }
        }

        return res.status(201).json({ message: 'Role created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

exports.updateRole = async (req, res) => {
    const { id } = req.params;
    const { name, permissions } = req.body;
    try {
        await db.execute('UPDATE roles SET name = ?, updated_at = NOW() WHERE id = ?', [name, id]);

        if (permissions && Array.isArray(permissions)) {
            await db.execute('DELETE FROM role_has_permissions WHERE role_id = ?', [id]);
            for (let permId of permissions) {
                await db.execute('INSERT INTO role_has_permissions (permission_id, role_id) VALUES (?, ?)', [permId, id]);
            }
        }

        return res.json({ message: 'Role updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

exports.createPermission = async (req, res) => {
    const { name, guard_name = 'web' } = req.body;
    try {
        await db.execute('INSERT INTO permissions (name, guard_name, created_at, updated_at) VALUES (?, ?, NOW(), NOW())', [name, guard_name]);
        return res.status(201).json({ message: 'Permission created successfully' });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.updatePermission = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    try {
        await db.execute('UPDATE permissions SET name = ?, updated_at = NOW() WHERE id = ?', [name, id]);
        return res.json({ message: 'Permission updated successfully' });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.deletePermission = async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute('DELETE FROM permissions WHERE id = ?', [id]);
        return res.json({ message: 'Permission deleted successfully' });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.bulkUpdatePermissions = async (req, res) => {
    const { matrix } = req.body;
    if (!matrix || typeof matrix !== 'object') {
        return res.status(400).json({ status: 'error', message: 'Invalid matrix payload' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        for (const [roleIdStr, permissionIds] of Object.entries(matrix)) {
            const roleId = parseInt(roleIdStr, 10);
            if (isNaN(roleId)) continue;

            // Delete old permissions for this role
            await connection.execute('DELETE FROM role_has_permissions WHERE role_id = ?', [roleId]);

            // Insert new permissions for this role
            if (Array.isArray(permissionIds) && permissionIds.length > 0) {
                // Bulk insert values: [ [permId1, roleId], [permId2, roleId], ... ]
                const values = permissionIds.map(permId => [permId, roleId]);
                await connection.query(
                    'INSERT INTO role_has_permissions (permission_id, role_id) VALUES ?',
                    [values]
                );
            }
        }

        await connection.commit();
        return res.json({ status: 'success', message: 'Permissions matrix updated successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('❌ Bulk permissions update error:', error);
        return res.status(500).json({ status: 'error', message: 'Server error: ' + error.message });
    } finally {
        connection.release();
    }
};

