const fs = require('fs');
const path = require('path');

const constantsPath = path.resolve('..', 'erp-next', 'src', 'lib', 'constants.ts');
let content = fs.readFileSync(constantsPath, 'utf8');

// Strip typescript type annotations and exports to evaluate STATIC_MENUS
content = content.replace(/import [^;]+;/g, '');
content = content.replace(/export /g, '');
content = content.replace(/const STATIC_MENUS: Menu\[\] =/, 'const STATIC_MENUS =');
content += '\nmodule.exports = STATIC_MENUS;';

const tempFile = path.resolve('src/scratch/temp_menus.cjs');
fs.writeFileSync(tempFile, content);

try {
  const menus = require(tempFile);
  console.log('Successfully loaded STATIC_MENUS!');
  console.log('Top-level modules count:', menus.length);
  const result = menus.map(m => ({
    id: m.id,
    name: m.name,
    path: m.path,
    submenus: (m.submenus || []).filter(s => !s.is_divider).map(s => ({
      id: s.id,
      name: s.name,
      path: s.path
    }))
  }));
  fs.writeFileSync('src/scratch/structured_menus.json', JSON.stringify(result, null, 2));
  console.log('Saved to src/scratch/structured_menus.json');
} catch (e) {
  console.error('Error loading menus:', e);
} finally {
  if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
}
