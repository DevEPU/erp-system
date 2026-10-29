const db = require('../config/db');

(async () => {
  try {
    const [users] = await db.query(`
      SELECT u.id, u.name, u.email, GROUP_CONCAT(r.name) as roles
      FROM users u
      LEFT JOIN model_has_roles mhr ON u.id = mhr.model_id
      LEFT JOIN roles r ON mhr.role_id = r.id
      GROUP BY u.id
    `);
    console.log('Users in system:');
    users.forEach(u => console.log(` - ID ${u.id}: ${u.name} (@${u.username}) | Roles: ${u.roles}`));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
