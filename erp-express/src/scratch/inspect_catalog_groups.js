const catalog = require('./all_permissions_catalog.json');

const targetKeys = ['approval', 'shift', 'budget', 'currenc', 'unit', 'setting', 'karyawan', 'role', 'user', 'log'];
const found = catalog.filter(c => targetKeys.some(k => c.name.toLowerCase().includes(k)));

console.log('Found', found.length, 'permissions in catalog:');
const byGroup = {};
found.forEach(f => {
  if (!byGroup[f.group]) byGroup[f.group] = [];
  byGroup[f.group].push(`${f.name} (${f.label})`);
});

for (const [group, perms] of Object.entries(byGroup)) {
  console.log(`\n=== Group: ${group} (${perms.length}) ===`);
  perms.forEach(p => console.log('  -', p));
}
