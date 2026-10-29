const db = require('../src/config/db');
const fs = require('fs');

async function checkDetails() {
  const [products] = await db.execute("SELECT id, product_code, product_name FROM products");
  const [mmu] = await db.execute(`
    SELECT mmu.*, m.code as mc_code, m.name as mc_name, mo.code as mold_code, mo.name as mold_name, p.product_code, p.product_name
    FROM machine_mold_uph mmu
    LEFT JOIN machines m ON m.id = mmu.machine_id
    LEFT JOIN molds mo ON mo.id = mmu.mold_id
    LEFT JOIN products p ON p.id = mmu.product_id
  `);

  const [boms] = await db.execute(`
    SELECT b.id, b.finished_good_code, b.finished_good_name,
           bi.product_code as child_code, bi.product_name as child_name, bi.qty
    FROM boms b
    LEFT JOIN bom_items bi ON bi.bom_id = b.id
  `);

  const rawMapped = JSON.parse(fs.readFileSync('scratch/uph_full_mapped.json'));
  
  const enhanced = [];

  for (const item of rawMapped) {
    let result = { ...item };

    if (!result.uph) {
      // Try searching BOM to see if it's an FG consisting of injection parts with MMU
      const clean = item.item_name.replace(/\(.*?\)/g, '').trim().toLowerCase();
      const bomMatches = boms.filter(b => 
        (b.finished_good_name && b.finished_good_name.toLowerCase().includes(clean)) ||
        (b.finished_good_code && b.finished_good_code.toLowerCase().includes(clean))
      );

      if (bomMatches.length > 0) {
        // Find child parts with MMU
        const childCodes = [...new Set(bomMatches.map(b => b.child_code))];
        const childMmu = mmu.filter(m => childCodes.includes(m.product_code));
        if (childMmu.length > 0) {
          result.product_code = bomMatches[0].finished_good_code;
          result.uph = childMmu[0].uph;
          result.cavity = childMmu[0].cavity;
          result.machine = `${childMmu[0].mc_code} (${childMmu[0].mc_name})`;
          result.mold = childMmu[0].mold_name;
          result.note = `BOM Assembly dari ${childMmu[0].product_name}`;
        }
      }

      // If still null, search products with partial keywords
      if (!result.uph) {
        const words = clean.split(' ').filter(w => w.length > 2);
        const pSub = products.filter(p => {
          const pName = (p.product_name || '').toLowerCase();
          return words.filter(w => pName.includes(w)).length >= Math.min(2, words.length);
        });

        if (pSub.length > 0) {
          const pIds = pSub.map(p => p.id);
          const matchedMmu = mmu.filter(m => pIds.includes(m.product_id));
          if (matchedMmu.length > 0) {
            result.product_code = pSub[0].product_code;
            result.uph = matchedMmu[0].uph;
            result.cavity = matchedMmu[0].cavity;
            result.machine = `${matchedMmu[0].mc_code} (${matchedMmu[0].mc_name})`;
            result.mold = matchedMmu[0].mold_name;
          } else {
            result.product_code = pSub[0].product_code;
          }
        }
      }
    }

    enhanced.push(result);
  }

  fs.writeFileSync('scratch/uph_enhanced_mapped.json', JSON.stringify(enhanced, null, 2));
  console.log(`Matched with UPH after BOM/Keyword linkage: ${enhanced.filter(e => e.uph !== null).length} / ${enhanced.length}`);
  process.exit(0);
}

checkDetails();
