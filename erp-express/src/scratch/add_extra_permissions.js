const pool = require('../config/db');
const fs = require('fs');

const additional = [
  { name: 'print_laporan_penjualan', group: 'REPORTS', label: 'Laporan Penjualan - Cetak Laporan' },
  { name: 'print_laporan_stok', group: 'REPORTS', label: 'Laporan Stok Gudang - Cetak Laporan' },
  { name: 'print_laporan_keuangan', group: 'REPORTS', label: 'Laporan Keuangan - Cetak Laporan' },
  { name: 'print_pr_reports', group: 'REPORTS', label: 'Laporan Purchase Request - Cetak' },
  { name: 'print_mb_reports', group: 'REPORTS', label: 'Laporan Master Budget - Cetak' },
  { name: 'import_karyawan', group: 'USER_SECURITY', label: 'Data Karyawan - Impor Data Excel' },
  { name: 'preview_settings_print', group: 'PENGATURAN', label: 'Pengaturan Cetakan - Preview Template' }
];

async function run() {
  const [existing] = await pool.query('SELECT name FROM permissions');
  const existingSet = new Set(existing.map(r => r.name));

  let inserted = 0;
  for (const item of additional) {
    if (!existingSet.has(item.name)) {
      await pool.execute(
        'INSERT INTO permissions (name, guard_name, created_at, updated_at) VALUES (?, "web", NOW(), NOW())',
        [item.name]
      );
      console.log('Inserted:', item.name);
      inserted++;
    }
  }
  console.log(`Inserted ${inserted} extra permissions.`);

  // Update all_permissions_catalog.json
  const catalogPath = 'src/scratch/all_permissions_catalog.json';
  if (fs.existsSync(catalogPath)) {
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    const catMap = new Set(catalog.map(c => c.name));
    for (const item of additional) {
      if (!catMap.has(item.name)) {
        catalog.push(item);
      }
    }
    fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
    console.log('Updated catalog.');
  }

  // Sync to Super Admin
  const [superAdmins] = await pool.query('SELECT id FROM roles WHERE name = "Super Admin"');
  if (superAdmins.length > 0) {
    const saId = superAdmins[0].id;
    const [allPerms] = await pool.query('SELECT id, name FROM permissions');
    const [existingSa] = await pool.query('SELECT permission_id FROM role_has_permissions WHERE role_id = ?', [saId]);
    const saSet = new Set(existingSa.map(r => r.permission_id));
    const missing = allPerms.filter(p => !saSet.has(p.id));
    if (missing.length > 0) {
      const vals = missing.map(p => [p.id, saId]);
      await pool.query('INSERT INTO role_has_permissions (permission_id, role_id) VALUES ?', [vals]);
      console.log('Synced', missing.length, 'to Super Admin');
    }
  }

  process.exit();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
