const db = require('../config/db');
const path = require('path');
const fs = require('fs');

(async () => {
  try {
    const [dbPerms] = await db.query('SELECT id, name FROM permissions ORDER BY name ASC');
    console.log('Total permissions in DB:', dbPerms.length);

    const mappingFile = path.resolve(__dirname, '../../../erp-next/src/lib/permissionMapping.ts');
    const content = fs.readFileSync(mappingFile, 'utf8');

    const keywords = ['approval', 'shift', 'budget', 'currenc', 'unit'];
    const matched = dbPerms.filter(p => keywords.some(k => p.name.toLowerCase().includes(k)));

    console.log('\nTarget permissions found in DB (' + matched.length + '):');
    for (const p of matched) {
      const idx = content.indexOf(`"${p.name}":`);
      if (idx !== -1) {
        const chunk = content.slice(idx, idx + 200);
        const groupMatch = chunk.match(/"group":\s*"([^"]+)"/);
        const labelMatch = chunk.match(/"label":\s*"([^"]+)"/);
        console.log(` - ${p.name.padEnd(28)} => group: ${(groupMatch ? groupMatch[1] : '???').padEnd(14)} | ${(labelMatch ? labelMatch[1] : '???')}`);
      } else {
        console.log(` - ${p.name.padEnd(28)} => NOT FOUND in CUSTOM_MAPPINGS`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
