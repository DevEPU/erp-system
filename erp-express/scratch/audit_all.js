const xlsx = require('xlsx');
const db = require('../src/config/db');

async function auditAll() {
  console.log('================================================================');
  console.log('         AUDIT KESESUAIAN MESIN, MOLD, DAN UPH');
  console.log('================================================================\n');

  const wb = xlsx.readFile('c:/laragon/www/erp-epu-main/Dataset/Production Planning Ach Rate Control Agustus 2026 Rev01.xlsx');
  
  // 1. AUDIT MESIN
  const [dbMachines] = await db.query(`
    SELECT id, code, name, capacity, line, status, standard_mp, leader_group 
    FROM machines 
    WHERE is_active = 1 
    ORDER BY CAST(SUBSTRING_INDEX(code, '-', -1) AS UNSIGNED) ASC
  `);

  console.log(`[1] AUDIT DATA MESIN (${dbMachines.length} Mesin di Database):`);
  console.log(`- Target Mesin Sesuai Gambar: 35 Unit`);
  console.log(`- Jumlah Mesin di Database  : ${dbMachines.length} Unit`);
  const machineMatch = dbMachines.length === 35;
  console.log(`- Status Jumlah: ${machineMatch ? '✅ SESUAI (100%)' : '❌ TIDAK SESUAI'}`);

  // 2. AUDIT EXCEL SHEETS MAPPINGS
  const numSheets = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '18'];
  const excelData = new Map(); // key: mc + '|' + codePart -> { mc, tonase, codePart, partName, uph, sheets: [] }

  numSheets.forEach(sName => {
    if (!wb.Sheets[sName]) return;
    const rows = xlsx.utils.sheet_to_json(wb.Sheets[sName], { header: 1 });
    let headerRow = -1;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r && (r[0] === 'MC' || r[1] === 'TONASE')) {
        headerRow = i;
        break;
      }
    }
    if (headerRow !== -1) {
      for (let i = headerRow + 2; i < rows.length; i++) {
        const r = rows[i];
        if (!r || r[0] == null || r[0] === 'Total' || isNaN(parseInt(r[0]))) continue;
        const mc = parseInt(r[0]);
        const tonase = parseInt(r[1]) || 0;
        const codePart = r[2] ? String(r[2]).trim() : '';
        const partName = r[3] ? String(r[3]).trim() : '';
        const uph = parseInt(r[4]) || 0;
        
        if (mc && codePart) {
          const key = `${mc}|${codePart}`;
          if (!excelData.has(key)) {
            excelData.set(key, { mc, tonase, codePart, partName, uph, uphs: [uph], sheets: [sName] });
          } else {
            const cur = excelData.get(key);
            if (!cur.sheets.includes(sName)) cur.sheets.push(sName);
            if (!cur.uphs.includes(uph)) cur.uphs.push(uph);
            if (uph > cur.uph) cur.uph = uph;
          }
        }
      }
    }
  });

  console.log(`\n[2] AUDIT KESESUAIAN MACHINE-MOLD-UPH:`);
  console.log(`- Total Pasangan Mesin - Part unik dari Excel: ${excelData.size} kombinasi`);

  // Load all DB UPH mappings
  const [dbUphs] = await db.query(`
    SELECT mmu.id, m.code as mc_code, m.name as mc_name, m.capacity as mc_capacity,
           mo.id as mold_id, mo.code as mold_code, mo.name as mold_name,
           p.id as prod_id, p.product_code, p.product_name,
           mmu.uph, mmu.is_primary
    FROM machine_mold_uph mmu
    JOIN machines m ON mmu.machine_id = m.id
    JOIN molds mo ON mmu.mold_id = mo.id
    JOIN products p ON mmu.product_id = p.id
    ORDER BY CAST(SUBSTRING_INDEX(m.code, '-', -1) AS UNSIGNED) ASC, mmu.uph DESC
  `);

  console.log(`- Total Record di machine_mold_uph Database : ${dbUphs.length} record`);

  // Create a fast lookup for DB UPH: key = mc_num + '|' + product_code
  const dbUphMap = new Map();
  dbUphs.forEach(row => {
    const mcNum = parseInt(row.mc_code.replace('MC-', ''));
    const key = `${mcNum}|${row.product_code.toUpperCase()}`;
    dbUphMap.set(key, row);
  });

  let matchCount = 0;
  let uphDiffs = [];
  let missingInDb = [];

  for (const [key, item] of excelData.entries()) {
    const dbRow = dbUphMap.get(`${item.mc}|${item.codePart.toUpperCase()}`);
    if (!dbRow) {
      missingInDb.push(item);
    } else {
      if (dbRow.uph === item.uph) {
        matchCount++;
      } else {
        uphDiffs.push({
          mc: item.mc,
          codePart: item.codePart,
          partName: item.partName,
          excelUph: item.uph,
          dbUph: dbRow.uph,
          allExcelUphs: item.uphs
        });
      }
    }
  }

  console.log(`\n--- HASIL VALIDASI 69 RELASI EXCEL KE DB ---`);
  console.log(`✅ Cocok 100% (Mesin, Part/Mold, & UPH sama persis) : ${matchCount} / ${excelData.size}`);
  console.log(`⚠️ Selisih UPH                                      : ${uphDiffs.length}`);
  console.log(`❌ Hilang di Database                               : ${missingInDb.length}`);

  if (uphDiffs.length > 0) {
    console.log('\nDetail Selisih UPH:', uphDiffs);
  }
  if (missingInDb.length > 0) {
    console.log('\nDetail Hilang di DB:', missingInDb);
  }

  // 3. AUDIT MOLD
  const [dbMolds] = await db.query(`
    SELECT m.id, m.code, m.name, COUNT(mp.product_id) as linked_prods
    FROM molds m
    LEFT JOIN mold_products mp ON m.id = mp.mold_id
    WHERE m.is_active = 1
    GROUP BY m.id
  `);
  console.log(`\n[3] AUDIT DATA MOLD:`);
  console.log(`- Total Mold Aktif di Database: ${dbMolds.length}`);
  const moldsWithoutProd = dbMolds.filter(m => m.linked_prods === 0);
  console.log(`- Mold yang belum ter-link ke produk: ${moldsWithoutProd.length}`);

  console.log('\n================================================================');
  console.log('                        KESIMPULAN AUDIT');
  console.log('================================================================');
  if (matchCount === excelData.size && missingInDb.length === 0 && dbMachines.length === 35) {
    console.log('🎉 SEMUA DATA (MESIN, MOLD, DAN UPH) TELAH 100% SESUAI DENGAN EXCEL & GAMBAR!');
  } else {
    console.log('⚠️ Ada beberapa catatan penyesuaian yang perlu ditinjau.');
  }

  process.exit(0);
}

auditAll().catch(err => {
  console.error('Audit Error:', err);
  process.exit(1);
});
