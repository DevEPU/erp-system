const xlsx = require('xlsx');
const db = require('../src/config/db');

async function main() {
  const wb = xlsx.readFile('c:/laragon/www/erp-epu-main/Dataset/Production Planning Ach Rate Control Agustus 2026 Rev01.xlsx');
  
  // 1. Gather all mappings from sheets 1..18
  const numSheets = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '18'];
  const mappingMap = new Map(); // key: mc + '|' + codePart -> { mc, tonase, codePart, partName, uph }
  const partMap = new Map(); // codePart -> { codePart, partName, uphs: [] }

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
            const cur = mappingMap.get(key);
            if (uph > cur.uph) cur.uph = uph;
          }

          if (!partMap.has(codePart)) {
            partMap.set(codePart, { codePart, partName, uph, mcs: [mc] });
          } else {
            const p = partMap.get(codePart);
            if (!p.mcs.includes(mc)) p.mcs.push(mc);
            if (uph > p.uph) p.uph = uph;
          }
        }
      }
    }
  });

  // DB Products
  const [dbProducts] = await db.query('SELECT id, product_code, product_name FROM products');
  const prodMap = new Map();
  dbProducts.forEach(p => {
    if (p.product_code) prodMap.set(p.product_code.toUpperCase().trim(), p);
  });

  // DB Molds
  const [dbMolds] = await db.query('SELECT m.id, m.code, m.name, mp.product_id FROM molds m LEFT JOIN mold_products mp ON m.id = mp.mold_id');
  const moldByCode = new Map();
  const moldByProdId = new Map();
  dbMolds.forEach(m => {
    moldByCode.set(m.code.toUpperCase().trim(), m);
    if (m.product_id) moldByProdId.set(m.product_id, m);
  });

  console.log(`Unique parts from Excel: ${partMap.size}`);
  let matchedMolds = 0;
  let missingMolds = [];

  for (const [codePart, pData] of partMap.entries()) {
    const prod = prodMap.get(codePart.toUpperCase());
    let mold = null;
    if (prod) {
      mold = moldByProdId.get(prod.id);
    }
    // Also check by mold code MOLD-<codePart suffix> or name
    if (!mold) {
      // try to find mold with code matching part code
      for (const m of dbMolds) {
        if (m.code && (m.code.includes(codePart) || codePart.includes(m.code.replace('MOLD-', '')))) {
          mold = m;
          break;
        }
      }
    }

    if (mold) {
      matchedMolds++;
    } else {
      missingMolds.push({ codePart, partName: pData.partName, prodId: prod?.id, prodName: prod?.product_name });
    }
  }

  console.log(`Parts with existing Mold in DB: ${matchedMolds} / ${partMap.size}`);
  console.log(`Parts needing Mold creation: ${missingMolds.length}`);
  console.log('Parts needing Mold:', missingMolds);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
