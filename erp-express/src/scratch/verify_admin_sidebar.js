const db = require('../config/db');
const path = require('path');

(async () => {
  try {
    // 1. Fetch permissions for Admin
    const [perms] = await db.query(`
      SELECT p.name 
      FROM permissions p 
      JOIN role_has_permissions rhp ON p.id = rhp.permission_id 
      WHERE rhp.role_id = 1
    `);
    const adminPerms = new Set(perms.map(p => p.name));

    // can() function simulation for Admin
    const can = (perm) => {
      if (adminPerms.has(perm)) return true;
      if (perm === 'access_approval_management' && adminPerms.has('access_approval_rules')) return true;
      if (perm === 'access_approval_rules' && adminPerms.has('access_approval_management')) return true;
      return false;
    };

    // Load structured menus and routePermissions
    const structuredMenus = require('./structured_menus.json');
    const { COMPONENT_PERMISSIONS } = require(path.resolve('../erp-next/src/lib/routePermissions.ts'));

    console.log('====================================================');
    console.log('SIMULATING SIDEBAR & ACCESS FOR ROLE: Admin (ID: 1)');
    console.log('====================================================\n');

    for (const menu of structuredMenus) {
      if (!menu.submenus || menu.submenus.length === 0) {
        // Leaf menu
        const reqPerm = COMPONENT_PERMISSIONS[menu.name];
        const isVisible = !reqPerm || can(reqPerm);
        console.log(`[Top Menu] ${menu.name} => ${isVisible ? 'VISIBLE' : 'HIDDEN'} (Req: ${reqPerm || 'none'})`);
        continue;
      }

      // Menu with submenus
      const visibleSubmenus = menu.submenus.filter(sub => {
        const perm = COMPONENT_PERMISSIONS[sub.name];
        return !perm || can(perm);
      });

      const isParentVisible = visibleSubmenus.length > 0;
      console.log(`[Top Menu] ${menu.name} => ${isParentVisible ? 'VISIBLE' : 'HIDDEN'} (${visibleSubmenus.length}/${menu.submenus.length} submenus)`);

      if (isParentVisible) {
        visibleSubmenus.forEach(s => {
          console.log(`   ✓ ${s.name} (${s.path})`);
        });
        const hiddenSubmenus = menu.submenus.filter(sub => {
          const perm = COMPONENT_PERMISSIONS[sub.name];
          return perm && !can(perm);
        });
        if (hiddenSubmenus.length > 0) {
          console.log(`   --- Hidden Submenus (${hiddenSubmenus.length}) ---`);
          hiddenSubmenus.forEach(s => {
            console.log(`   ✗ ${s.name} [Blocked by: ${COMPONENT_PERMISSIONS[s.name]}]`);
          });
        }
      }
      console.log('');
    }

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
