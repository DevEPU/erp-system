const fs = require('fs');
const path = require('path');

const structuredMenus = require('./structured_menus.json');
const sidebarContent = fs.readFileSync(path.resolve('..', 'erp-next', 'src', 'components', 'ui', 'Sidebar.tsx'), 'utf8');

// Extract keys of COMPONENT_PERMISSIONS
const match = sidebarContent.match(/const COMPONENT_PERMISSIONS: Record<string, string> = {([\s\S]*?)};/);
if (!match) {
  console.error('Could not find COMPONENT_PERMISSIONS in Sidebar.tsx');
  process.exit(1);
}

const lines = match[1].split('\n');
const permMap = {};
for (const line of lines) {
  const m = line.match(/^\s*["']?([^"':]+)["']?\s*:\s*["']([^"']+)["']/);
  if (m) {
    permMap[m[1].trim()] = m[2].trim();
  }
}

console.log('Total mapped keys in Sidebar.tsx:', Object.keys(permMap).length);

const unmapped = [];
const mapped = [];

for (const m of structuredMenus) {
  // Check parent
  if (m.name !== 'Dashboard' && !permMap[m.name]) {
    unmapped.push(`[PARENT] ${m.name} -> path: ${m.path}`);
  } else if (m.name !== 'Dashboard') {
    mapped.push(`[PARENT] ${m.name} => ${permMap[m.name]}`);
  }

  // Check submenus
  for (const s of m.submenus) {
    if (!permMap[s.name]) {
      unmapped.push(`[SUBMENU] ${s.name} (${m.name}) -> path: ${s.path}`);
    } else {
      mapped.push(`[SUBMENU] ${s.name} => ${permMap[s.name]}`);
    }
  }
}

console.log('\n--- UNMAPPED MENUS (' + unmapped.length + ') ---');
unmapped.forEach(u => console.log('  ❌', u));

console.log('\n--- MAPPED MENUS (' + mapped.length + ') ---');
console.log('Total successfully mapped:', mapped.length);
