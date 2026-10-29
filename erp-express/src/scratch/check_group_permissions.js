const db = require('../config/db');
const path = require('path');
const fs = require('fs');

(async () => {
  try {
    const [dbPerms] = await db.query('SELECT id, name FROM permissions ORDER BY name ASC');
    const mappingFile = path.resolve(__dirname, '../../../erp-next/src/lib/permissionMapping.ts');
    
    // We can evaluate or import getPermissionMapping
    // Let's create a quick function reading the generated file
    const content = fs.readFileSync(mappingFile, 'utf8');

    // Parse PERMISSION_GROUPS from file
    const groupsMatch = content.match(/export const PERMISSION_GROUPS = (\[[\s\S]*?\]);/);
    const groups = JSON.parse(groupsMatch[1]);

    const groupItems = {};
    groups.forEach(g => groupItems[g.id] = []);

    for (const p of dbPerms) {
      const idx = content.indexOf(`"${p.name}":`);
      let group = 'LAIN_LAIN';
      let label = p.name;
      if (idx !== -1) {
        const chunk = content.slice(idx, idx + 200);
        const gm = chunk.match(/"group":\s*"([^"]+)"/);
        const lm = chunk.match(/"label":\s*"([^"]+)"/);
        if (gm) group = gm[1];
        if (lm) label = lm[1];
      }
      if (!groupItems[group]) groupItems[group] = [];
      groupItems[group].push({ name: p.name, label });
    }

    console.log('=== PENGATURAN permissions (' + (groupItems['PENGATURAN']?.length || 0) + ') ===');
    (groupItems['PENGATURAN'] || []).forEach(x => console.log('  *', x.label, `(${x.name})`));

    console.log('\n=== USER_SECURITY permissions (' + (groupItems['USER_SECURITY']?.length || 0) + ') ===');
    (groupItems['USER_SECURITY'] || []).forEach(x => console.log('  *', x.label, `(${x.name})`));

    console.log('\n=== LAIN_LAIN permissions (' + (groupItems['LAIN_LAIN']?.length || 0) + ') ===');
    (groupItems['LAIN_LAIN'] || []).forEach(x => console.log('  *', x.label, `(${x.name})`));

  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
})();
