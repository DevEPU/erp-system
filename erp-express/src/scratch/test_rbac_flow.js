const pool = require('../config/db');
const path = require('path');

const { getRequiredPermissionForPath } = require(path.resolve('..', 'erp-next', 'src', 'lib', 'routePermissions.ts'));

async function testRbac() {
  console.log('--- TESTING COMPLETE RBAC FLOW ---');

  // 1. Pick a sample role from DB
  const [roles] = await pool.query('SELECT id, name FROM roles WHERE name != "Super Admin" LIMIT 3');
  console.log('Sample Roles:', roles.map(r => `${r.name} (ID: ${r.id})`));

  for (const role of roles) {
    const [perms] = await pool.query(`
      SELECT p.name 
      FROM permissions p 
      JOIN role_has_permissions rhp ON p.id = rhp.permission_id 
      WHERE rhp.role_id = ?
    `, [role.id]);

    console.log(`\nRole: ${role.name} has ${perms.length} permissions.`);
    const permNames = perms.map(p => p.name);

    // Test a few paths against this role's permissions
    const testPaths = [
      '/dashboard',
      '/supplier-pembelian/purchase-order',
      '/settings/roles',
      '/settings/permissions',
      '/manufacturing/work-order',
      '/general-ledger/budgeting'
    ];

    testPaths.forEach(tp => {
      const required = getRequiredPermissionForPath(tp);
      let allowed = false;
      if (!required) {
        allowed = true; // public / authenticated
      } else {
        allowed = permNames.includes(required);
      }
      console.log(`  Path: ${tp.padEnd(38)} | Required: ${(required || 'NONE').padEnd(25)} | Access: ${allowed ? '✅ ALLOWED' : '🚫 BLOCKED'}`);
    });
  }

  process.exit();
}

testRbac().catch(e => {
  console.error(e);
  process.exit(1);
});
