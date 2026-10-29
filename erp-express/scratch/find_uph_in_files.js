const fs = require('fs');
const xlsx = require('xlsx');
const path = require('path');

const rootDir = 'c:/laragon/www/erp-epu-main';
const files = [
  '8. Agustus 2026 MRP-1.xlsx',
  '8. Agustus 2026 MRP-2 Rev02.xlsx',
  'MD BOM.xlsx',
  'ERP_MultiLevel_BOM_Full_System.xlsx',
  'ERP_Integrated_Master_BOM_MRP.xlsx',
  'ERP_Full_Database_Product_Master_MRP.xlsx',
  'Customer & Part FG.xlsx'
];

for (const file of files) {
  try {
    const wb = xlsx.readFile(path.join(rootDir, file));
    console.log(`\n========================================`);
    console.log(`FILE: ${file}`);
    for (const sheet of wb.SheetNames) {
      const ws = wb.Sheets[sheet];
      const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
      console.log(`Sheet: [${sheet}] (${rows.length} rows)`);
      for (let i = 0; i < Math.min(10, rows.length); i++) {
        if (rows[i] && rows[i].length > 0) {
          // print if has any header-like words
          const str = rows[i].join(' | ');
          if (str.toLowerCase().includes('uph') || str.toLowerCase().includes('cav') || str.toLowerCase().includes('cycle') || str.toLowerCase().includes('part') || str.toLowerCase().includes('name') || str.toLowerCase().includes('tonnage') || str.toLowerCase().includes('mesin')) {
            console.log(`  Row ${i}: ${str.slice(0, 150)}`);
          }
        }
      }
    }
  } catch (e) {
    console.error(`Error in ${file}:`, e.message);
  }
}
