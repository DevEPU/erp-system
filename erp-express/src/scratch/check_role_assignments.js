const db = require('../config/db');

(async () => {
  try {
    const [roles] = await db.query('SELECT id, name FROM roles ORDER BY id ASC');
    console.log('Roles in system:', roles.map(r => `${r.id}: ${r.name}`).join(', '));

    const checkPerms = [
      'access_approval_requests',
      'approve_approval_requests',
      'access_daftar_shift',
      'access_approval_management',
      'access_approval_rules',
      'access_budget',
      'access_currencies',
      'access_units'
    ];

    console.log('\n--- Role Permission Assignment for Moved Menus ---');
    for (const r of roles) {
      const [assigned] = await db.query(`
        SELECT p.name 
        FROM permissions p 
        JOIN role_has_permissions rhp ON p.id = rhp.permission_id 
        WHERE rhp.role_id = ? AND p.name IN (?)
      `, [r.id, checkPerms]);

      const assignedNames = assigned.map(a => a.name);
      console.log(`Role [${r.name}] (ID: ${r.id}) has ${assigned.length}/${checkPerms.length}:`, assignedNames.join(', ') || '(none)');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
