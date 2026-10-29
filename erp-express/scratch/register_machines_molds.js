const xlsx = require('xlsx');
const db = require('../src/config/db');

const machineSpecs = [
  { mc: 1, ton: 170, year: 2024, group: 'Sharing', mp: 1 },
  { mc: 2, ton: 200, year: 2019, group: 'OFF', mp: 1 },
  { mc: 3, ton: 220, year: 2024, group: 'OFF', mp: 1 },
  { mc: 4, ton: 220, year: 2024, group: 'Dedicated', mp: 1 },
  { mc: 5, ton: 220, year: 2024, group: 'Sharing', mp: 1 },
  { mc: 6, ton: 220, year: 2024, group: 'Sharing', mp: 1 },
  { mc: 7, ton: 320, year: 2019, group: 'Dedicated', mp: 1 },
  { mc: 8, ton: 320, year: 2020, group: 'Dedicated', mp: 1 },
  { mc: 9, ton: 320, year: 2021, group: 'Dedicated', mp: 1 },
  { mc: 10, ton: 400, year: 2024, group: 'Dedicated', mp: 1 },
  { mc: 11, ton: 600, year: 2021, group: 'Dedicated', mp: 3 },
  { mc: 12, ton: 650, year: 2019, group: 'Dedicated', mp: 2 },
  { mc: 13, ton: 550, year: 2024, group: 'Dedicated', mp: 1 },
  { mc: 14, ton: 550, year: 2024, group: 'Dedicated', mp: 1 },
  { mc: 15, ton: 750, year: 2024, group: 'Dedicated', mp: 2 },
  { mc: 16, ton: 650, year: 2024, group: 'Dedicated', mp: 1 },
  { mc: 17, ton: 850, year: 2023, group: 'Dedicated', mp: 3 },
  { mc: 18, ton: 850, year: 2024, group: 'Dedicated', mp: 3 },
  { mc: 19, ton: 850, year: 2024, group: 'Dedicated', mp: 3 },
  { mc: 21, ton: 170, year: 2024, group: 'OFF', mp: 1 },
  { mc: 22, ton: 200, year: 2019, group: 'Dedicated', mp: 1 },
  { mc: 23, ton: 200, year: 2021, group: 'Dedicated', mp: 1 },
  { mc: 24, ton: 220, year: 2024, group: 'Sharing', mp: 1 },
  { mc: 25, ton: 220, year: 2024, group: 'Dedicated', mp: 1 },
  { mc: 26, ton: 220, year: 2024, group: 'Dedicated', mp: 1 },
  { mc: 27, ton: 260, year: 2022, group: 'Dedicated', mp: 1 },
  { mc: 28, ton: 320, year: 2023, group: 'Sharing', mp: 1 },
  { mc: 29, ton: 450, year: 2024, group: 'OFF', mp: 1 },
  { mc: 30, ton: 450, year: 2024, group: 'Dedicated', mp: 1 },
  { mc: 32, ton: 650, year: 2024, group: 'Dedicated', mp: 2 },
  { mc: 35, ton: 500, year: 2021, group: 'Sharing', mp: 1 },
  { mc: 36, ton: 500, year: 2021, group: 'Dedicated', mp: 2 },
  { mc: 37, ton: 800, year: 2022, group: 'Sharing', mp: 2 },
  { mc: 38, ton: 850, year: 2024, group: 'Dedicated', mp: 2 },
  { mc: 39, ton: 1050, year: 2023, group: 'Dedicated', mp: 3 }
];

async function main() {
  console.log('=== STARTING REGISTRATION: MACHINES & MOLDS ===\n');

  // 1. REGISTER 35 MACHINES
  console.log('--- Step 1: Registering 35 Machines ---');
  for (const m of machineSpecs) {
    const code = `MC-${m.mc}`;
    const name = `Injection ${m.ton}T`;
    const type = 'Injection';
    const line = m.mc <= 20 ? 'Line Injection 1' : 'Line Injection 2';
    const capacity = `${m.ton} Ton`;
    const status = m.group === 'OFF' ? 'Idle' : 'Running';
    const leader_group = m.group;
    const standard_mp = m.mp;

    // Check if machine with this code exists (or 'MC 22' for 22)
    const [existing] = await db.query(
      'SELECT id, code FROM machines WHERE code = ? OR code = ?',
      [code, `MC ${m.mc}`]
    );

    if (existing.length > 0) {
      await db.query(
        `UPDATE machines SET 
           code = ?, name = ?, type = ?, line = ?, capacity = ?, status = ?, 
           leader_group = ?, standard_mp = ?, is_active = 1, updated_at = NOW() 
         WHERE id = ?`,
        [code, name, type, line, capacity, status, leader_group, standard_mp, existing[0].id]
      );
      console.log(`[UPDATED] Machine ${code} (ID: ${existing[0].id}, ${capacity}, ${name})`);
    } else {
      const [insertRes] = await db.query(
        `INSERT INTO machines (code, name, type, line, capacity, status, leader_group, standard_mp, is_active, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        [code, name, type, line, capacity, status, leader_group, standard_mp]
      );
      console.log(`[INSERTED] Machine ${code} (ID: ${insertRes.insertId}, ${capacity}, ${name})`);
    }
  }

  // 2. READ EXCEL DATA (SHEETS 1..18)
  console.log('\n--- Step 2: Reading Excel Sheets 1..18 for Molds & UPH ---');
  const wb = xlsx.readFile('c:/laragon/www/erp-epu-main/Dataset/Production Planning Ach Rate Control Agustus 2026 Rev01.xlsx');
  const numSheets = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '18'];
  
  const mappingMap = new Map(); // key: mc + '|' + codePart -> { mc, tonase, codePart, partName, uph }
  const partMap = new Map(); // codePart -> { codePart, partName, uph }

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
            partMap.set(codePart, { codePart, partName, uph });
          } else {
            const p = partMap.get(codePart);
            if (uph > p.uph) p.uph = uph;
          }
        }
      }
    }
  });
  console.log(`Extracted ${partMap.size} unique parts and ${mappingMap.size} machine-part mappings.`);

  // 3. ENSURE ALL MOLDS EXIST & ARE LINKED TO PRODUCTS
  console.log('\n--- Step 3: Registering / Ensuring Molds in Database ---');
  const [dbProducts] = await db.query('SELECT id, product_code, product_name FROM products');
  const prodByCode = new Map();
  dbProducts.forEach(p => {
    if (p.product_code) prodByCode.set(p.product_code.toUpperCase().trim(), p);
  });

  const [dbMolds] = await db.query('SELECT id, code, name FROM molds');
  const moldByCode = new Map();
  dbMolds.forEach(m => {
    if (m.code) moldByCode.set(m.code.toUpperCase().trim(), m);
  });

  const partToMoldId = new Map(); // codePart -> mold_id

  for (const [codePart, pData] of partMap.entries()) {
    const prod = prodByCode.get(codePart.toUpperCase());
    if (!prod) {
      console.warn(`Product not found in DB for code: ${codePart}`);
      continue;
    }

    // Check if mold exists linked to this product in mold_products
    const [linkedMolds] = await db.query(
      'SELECT mold_id FROM mold_products WHERE product_id = ?',
      [prod.id]
    );

    let moldId = null;
    if (linkedMolds.length > 0) {
      moldId = linkedMolds[0].mold_id;
    } else {
      // Check if mold exists with code matching
      const expectedCode = `MOLD-${codePart.replace(/^EP[A-Z0-9]{2}-/, '')}`;
      const [existingMold] = await db.query(
        'SELECT id FROM molds WHERE code = ? OR name = ?',
        [expectedCode, pData.partName]
      );

      if (existingMold.length > 0) {
        moldId = existingMold[0].id;
      } else {
        // Create new mold
        const [insertMold] = await db.query(
          `INSERT INTO molds (code, name, description, is_active, created_at, updated_at)
           VALUES (?, ?, ?, 1, NOW(), NOW())`,
          [expectedCode, pData.partName, `Mold untuk part ${pData.partName} (${codePart})`]
        );
        moldId = insertMold.insertId;
        console.log(`[CREATED MOLD] ${expectedCode} - ${pData.partName} (ID: ${moldId})`);
      }

      // Link mold_products
      await db.query(
        'INSERT IGNORE INTO mold_products (mold_id, product_id, created_at) VALUES (?, ?, NOW())',
        [moldId, prod.id]
      );
      console.log(`[LINKED] Mold ID ${moldId} linked to Product ID ${prod.id} (${codePart})`);
    }

    partToMoldId.set(codePart.toUpperCase(), moldId);
  }

  // 4. REGISTER MACHINE-MOLD-UPH MAPPINGS
  console.log('\n--- Step 4: Registering Machine-Mold-UPH Matrix ---');
  // Load updated machines map: code -> id
  const [allMachines] = await db.query('SELECT id, code FROM machines WHERE is_active = 1');
  const machineByCode = new Map();
  allMachines.forEach(m => {
    machineByCode.set(m.code.toUpperCase().trim(), m.id);
  });

  // Keep track of primary per machine (highest UPH or first)
  const machinePrimaryUph = new Map(); // machineId -> maxUph

  let uphInserted = 0;
  for (const item of mappingMap.values()) {
    const mCode = `MC-${item.mc}`.toUpperCase();
    const machineId = machineByCode.get(mCode);
    const prod = prodByCode.get(item.codePart.toUpperCase());
    const moldId = partToMoldId.get(item.codePart.toUpperCase());

    if (!machineId) {
      console.warn(`Machine not found for code: ${mCode}`);
      continue;
    }
    if (!prod || !moldId) {
      console.warn(`Product/Mold not found for code: ${item.codePart}`);
      continue;
    }

    const isPrimary = (!machinePrimaryUph.has(machineId) || item.uph > machinePrimaryUph.get(machineId)) ? 1 : 0;
    if (isPrimary) {
      machinePrimaryUph.set(machineId, item.uph);
    }

    // Insert or update machine_mold_uph
    const [existingUph] = await db.query(
      'SELECT id FROM machine_mold_uph WHERE machine_id = ? AND mold_id = ? AND product_id = ?',
      [machineId, moldId, prod.id]
    );

    if (existingUph.length > 0) {
      await db.query(
        `UPDATE machine_mold_uph SET uph = ?, cavity = 1, updated_at = NOW() WHERE id = ?`,
        [item.uph, existingUph[0].id]
      );
    } else {
      await db.query(
        `INSERT INTO machine_mold_uph (machine_id, mold_id, product_id, uph, cavity, is_primary, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, NOW(), NOW())`,
        [machineId, moldId, prod.id, item.uph, isPrimary]
      );
      uphInserted++;
    }
  }
  console.log(`[SUCCESS] Processed ${mappingMap.size} machine-mold UPH mappings (${uphInserted} new records).`);

  // Ensure each machine has exactly 1 is_primary = 1
  for (const m of allMachines) {
    const [mUphs] = await db.query(
      'SELECT id, uph FROM machine_mold_uph WHERE machine_id = ? ORDER BY uph DESC LIMIT 1',
      [m.id]
    );
    if (mUphs.length > 0) {
      await db.query('UPDATE machine_mold_uph SET is_primary = 0 WHERE machine_id = ?', [m.id]);
      await db.query('UPDATE machine_mold_uph SET is_primary = 1 WHERE id = ?', [mUphs[0].id]);
      await db.query('UPDATE machines SET capacity = ? WHERE id = ?', [`${mUphs[0].uph} Pcs/Jam`, m.id]);
    }
  }

  // 5. SUMMARY STATS
  const [totalM] = await db.query('SELECT COUNT(*) as c FROM machines WHERE is_active = 1');
  const [totalMolds] = await db.query('SELECT COUNT(*) as c FROM molds WHERE is_active = 1');
  const [totalUph] = await db.query('SELECT COUNT(*) as c FROM machine_mold_uph');

  console.log('\n================ FINAL RESULT ================');
  console.log(`Total Active Machines in DB: ${totalM[0].c}`);
  console.log(`Total Active Molds in DB: ${totalMolds[0].c}`);
  console.log(`Total Machine-Mold UPH records in DB: ${totalUph[0].c}`);
  console.log('==============================================\n');

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error during registration:', err);
  process.exit(1);
});
