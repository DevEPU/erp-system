const xlsx = require('xlsx');
const db = require('../src/config/db');

async function main() {
  const wb = xlsx.readFile('c:/laragon/www/erp-epu-main/Dataset/Production Planning Ach Rate Control Agustus 2026 Rev01.xlsx');
  
  // 1. Gather all mappings from sheets 1..18
  const numSheets = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '18'];
  const mappingMap = new Map(); // key: mc + '|' + codePart -> { mc, tonase, codePart, partName, uph }

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
          if (!mappingMap.has(key)) {
            mappingMap.set(key, { mc, tonase, codePart, partName, uph });
          } else {
            // Update uph if higher or non-zero
            const cur = mappingMap.get(key);
            if (uph > cur.uph) cur.uph = uph;
          }
        }
      }
    }
  });

  console.log(`Total Unique Machine-Part-UPH mappings found in Excel: ${mappingMap.size}`);

  // 2. Check which products exist in DB
  const [dbProducts] = await db.query('SELECT id, product_code, product_name FROM products');
  const prodCodeMap = new Map();
  dbProducts.forEach(p => {
    if (p.product_code) prodCodeMap.set(p.product_code.toLowerCase().trim(), p);
  });

  const [dbMolds] = await db.query('SELECT id, code, name FROM molds');
  const moldCodeMap = new Map();
  dbMolds.forEach(m => {
    if (m.code) moldCodeMap.set(m.code.toLowerCase().trim(), m);
  });

  console.log(`Products in DB: ${dbProducts.length}, Molds in DB: ${dbMolds.length}`);

  let matchProdCount = 0;
  let missingProds = [];
  const uniqueParts = new Map();

  for (const item of mappingMap.values()) {
    uniqueParts.set(item.codePart, item.partName);
    const p = prodCodeMap.get(item.codePart.toLowerCase());
    if (p) {
      matchProdCount++;
    } else {
      missingProds.push(item);
    }
  }

  console.log(`Unique Parts in Excel: ${uniqueParts.size}`);
  console.log(`Machine-Part mappings where product exists in DB: ${matchProdCount} / ${mappingMap.size}`);
  if (missingProds.length > 0) {
    console.log('Missing Products sample (not found in DB by exact code):', missingProds.slice(0, 10));
  }

  // Check unique machines in mappingMap
  const machineTonase = new Map();
  for (const item of mappingMap.values()) {
    machineTonase.set(item.mc, item.tonase);
  }
  console.log('\nMachines active in planning sheets:', Array.from(machineTonase.entries()).sort((a,b) => a[0] - b[0]));

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
