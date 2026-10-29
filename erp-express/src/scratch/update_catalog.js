const fs = require('fs');
const path = require('path');
const catalog = require('./all_permissions_catalog.json');

const newCatalogItems = [
  {
    name: 'access_approval_rules',
    group: 'USER_SECURITY',
    label: 'Approval Rules - Akses Menu'
  },
  {
    name: 'show_approval_rules',
    group: 'USER_SECURITY',
    label: 'Approval Rules - Lihat Detail Aturan'
  },
  {
    name: 'reject_approval_requests',
    group: 'USER_SECURITY',
    label: 'Approval Request - Tolak Permintaan (Reject)'
  },
  {
    name: 'show_approval_requests',
    group: 'USER_SECURITY',
    label: 'Approval Request - Lihat Detail Permintaan'
  },
  {
    name: 'create_approval_request_logs',
    group: 'USER_SECURITY',
    label: 'Approval Request - Log Aktivitas Approval'
  },
  {
    name: 'remaining_budget',
    group: 'PENGATURAN',
    label: 'Budgeting - Sisa Budget (Remaining Budget)'
  }
];

for (const item of newCatalogItems) {
  const existing = catalog.find(c => c.name === item.name);
  if (existing) {
    existing.group = item.group;
    existing.label = item.label;
  } else {
    catalog.push(item);
  }
}

// Re-verify moved items
for (const c of catalog) {
  // USER_SECURITY
  if (
    c.name.includes('approval_request') ||
    c.name.includes('approval_rule') ||
    c.name === 'access_approval_management' ||
    c.name.includes('daftar_shift')
  ) {
    c.group = 'USER_SECURITY';
  }

  // PENGATURAN
  if (
    c.name.includes('currencies') ||
    c.name.includes('units') ||
    (c.name.includes('budget') && !c.name.includes('budget_cc') && !c.name.includes('mb_report'))
  ) {
    c.group = 'PENGATURAN';
  }
}

const catalogPath = path.resolve(__dirname, 'all_permissions_catalog.json');
fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
console.log('Catalog updated at:', catalogPath, '! Total catalog items:', catalog.length);
