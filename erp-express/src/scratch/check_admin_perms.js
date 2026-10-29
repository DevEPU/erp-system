const db = require('../config/db');

(async () => {
  try {
    const [perms] = await db.query(`
      SELECT p.name 
      FROM permissions p 
      JOIN role_has_permissions rhp ON p.id = rhp.permission_id 
      WHERE rhp.role_id = 1
      ORDER BY p.name ASC
    `);
    console.log(`Role Admin has ${perms.length} permissions:`);
    console.log(perms.map(p => p.name).join(', '));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
