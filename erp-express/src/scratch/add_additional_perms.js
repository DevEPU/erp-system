const db = require('../config/db');

(async () => {
  try {
    const newPerms = [
      { name: 'access_approval_rules', guard_name: 'web' },
      { name: 'reject_approval_requests', guard_name: 'web' },
      { name: 'show_approval_requests', guard_name: 'web' },
      { name: 'show_approval_rules', guard_name: 'web' }
    ];

    for (const p of newPerms) {
      const [existing] = await db.query('SELECT id FROM permissions WHERE name = ?', [p.name]);
      if (existing.length === 0) {
        const [res] = await db.query('INSERT INTO permissions (name, guard_name, created_at, updated_at) VALUES (?, ?, NOW(), NOW())', [p.name, p.guard_name]);
        console.log(`Inserted permission: ${p.name} (ID: ${res.insertId})`);
        
        // Assign to Super Admin (ID: 2)
        await db.query('INSERT IGNORE INTO role_has_permissions (permission_id, role_id) VALUES (?, 2)', [res.insertId]);
        console.log(`Assigned ${p.name} to Super Admin`);
      } else {
        console.log(`Permission already exists: ${p.name} (ID: ${existing[0].id})`);
        await db.query('INSERT IGNORE INTO role_has_permissions (permission_id, role_id) VALUES (?, 2)', [existing[0].id]);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
