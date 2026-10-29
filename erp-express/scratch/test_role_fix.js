const db = require('../src/config/db');

async function testRoleUpdate() {
    try {
        console.log('--- Testing Role Update Logic ---');
        
        // 1. Create a dummy role
        const [roleResult] = await db.execute('INSERT INTO roles (name, guard_name, created_at, updated_at) VALUES (?, "web", NOW(), NOW())', ['Test Role ' + Date.now()]);
        const roleId = roleResult.insertId;
        console.log('Created test role ID:', roleId);

        // 2. Get some permissions
        const [perms] = await db.execute('SELECT id FROM permissions LIMIT 3');
        const permIds = perms.map(p => p.id);
        console.log('Using permission IDs:', permIds);

        // 3. Update role with permissions (Simulating Controller logic)
        console.log('Simulating updateRole with IDs...');
        await db.execute('DELETE FROM role_has_permissions WHERE role_id = ?', [roleId]);
        for (let permId of permIds) {
            await db.execute('INSERT INTO role_has_permissions (permission_id, role_id) VALUES (?, ?)', [permId, roleId]);
        }

        // 4. Verify
        const [verifyRows] = await db.execute('SELECT permission_id FROM role_has_permissions WHERE role_id = ?', [roleId]);
        const verifyIds = verifyRows.map(r => r.permission_id);
        console.log('Verified permission IDs in DB:', verifyIds);

        if (JSON.stringify(permIds.sort()) === JSON.stringify(verifyIds.sort())) {
            console.log('SUCCESS: Permissions were correctly saved!');
        } else {
            console.log('FAILURE: Mismatch in saved permissions.');
        }

        // Cleanup
        await db.execute('DELETE FROM role_has_permissions WHERE role_id = ?', [roleId]);
        await db.execute('DELETE FROM roles WHERE id = ?', [roleId]);
        console.log('Cleanup complete.');

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        process.exit();
    }
}

testRoleUpdate();
