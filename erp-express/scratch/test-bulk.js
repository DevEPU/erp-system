const mysql = require('mysql2/promise');
require('dotenv').config();

async function test() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    await connection.beginTransaction();
    
    const [roles] = await connection.execute('SELECT id FROM roles LIMIT 1');
    const [perms] = await connection.execute('SELECT id FROM permissions LIMIT 3');
    
    if (roles.length === 0 || perms.length === 0) {
      console.log('No roles or permissions found to test with.');
      return;
    }
    
    const roleId = roles[0].id;
    const permIds = perms.map(p => p.id);
    
    console.log(`Testing: Syncing role ID ${roleId} with permission IDs:`, permIds);
    
    // Backup existing role_has_permissions for this role
    const [backup] = await connection.execute('SELECT permission_id FROM role_has_permissions WHERE role_id = ?', [roleId]);
    const backupIds = backup.map(b => b.permission_id);
    
    // Test Delete
    await connection.execute('DELETE FROM role_has_permissions WHERE role_id = ?', [roleId]);
    
    // Test Insert
    const values = permIds.map(id => [id, roleId]);
    await connection.query('INSERT INTO role_has_permissions (permission_id, role_id) VALUES ?', [values]);
    
    // Restore backup to avoid leaving test side effects
    await connection.execute('DELETE FROM role_has_permissions WHERE role_id = ?', [roleId]);
    if (backupIds.length > 0) {
      const restoreValues = backupIds.map(id => [id, roleId]);
      await connection.query('INSERT INTO role_has_permissions (permission_id, role_id) VALUES ?', [restoreValues]);
    }
    
    await connection.commit();
    console.log('✅ SQL Query test for transaction passed successfully!');
  } catch (err) {
    await connection.rollback();
    console.error('❌ SQL Query test failed:', err);
  } finally {
    await connection.end();
  }
}

test();
