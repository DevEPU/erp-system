const db = require('../config/db');

(async () => {
  try {
    const [perms] = await db.query(`
      SELECT p.id, p.name 
      FROM permissions p 
      JOIN role_has_permissions rhp ON p.id = rhp.permission_id 
      WHERE rhp.role_id = 1
      ORDER BY p.name ASC
    `);

    console.log(`Total current permissions for Admin (Role ID 1): ${perms.length}`);
    perms.forEach(p => console.log(` - ${p.id}: ${p.name}`));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
