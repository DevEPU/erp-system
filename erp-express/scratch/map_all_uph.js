const db = require('../src/config/db');
const fs = require('fs');

const searchItems = [
  "BOX LUGGAGE K2FK",
  "PROTECTOR MUFFLER K2SA",
  "PROTECTOR MUFFLER K59",
  "RR GRAB RAIL K1AL",
  "RR GRAB RAIL K2FP",
  "BOX LUGGAGE K1Z",
  "PLATE BOTTOM K3VA",
  "PLATE BOTTOM SUZUKI (45111-12K10)",
  "HOLDER MIRROR S/A RH",
  "HOLDER MIRROR S/A LH",
  "HOLDER MIRROR K3VA",
  "PLATE BOTTOM K1AL SC",
  "COVER AIR CLEANER K60",
  "ELEMENT COMP A/C K60R",
  "SET ILLUST AC ELEMENT KOJA",
  "SET ILLUST AIR C ELEMENT K2V",
  "ELEMENT COMP A/C KOJA",
  "SUB ASSY COVER AIR CLEANER K1AA",
  "SUB ASSY COVER AIR CLEANER KOJA",
  "CASE AIR CLEANER KWN (K2V)",
  "SUB ASSY CASE AIR CLEANER KOJA",
  "SUB ASSY CASE AIR CLEANER K1AL",
  "COVER SUB ASSY AIR CLEANER KOJA (AHM-PC)",
  "CASE SUB ASSY AIR CLEANER KOJA (AHM-PC)",
  "GRIP HANDLE BRACKET BZ050",
  "GRIP PARKING BRAKE LEVER 0K130",
  "HOLDER MIRROR BACK RH K97G",
  "HOLDER MIRROR BACK LH K97G",
  "HOLDER MIRROR BACK RH KZLG",
  "HOLDER MIRROR BACK LH KZLG",
  "SUB ASSY HOLDER MIRROR BACK RH/LH K93",
  "COVER PARKING BRAKE HOLE F1010",
  "BACK MRR STYLISH RL YM 12-BMST-M10BYR AM",
  "BACK MRR STYLISH RL HD 12-BMST-M10BHR AM",
  "BACK MRR GN LOOK RL HD FP-BMGL-M10BHR AM",
  "BACK MRR GN LOOK RL YM FP-BMGL-M10BYR AM",
  "BACK MRR GN LOOK RL HD 12-BMGL-M10BHR AM",
  "BACK MRR GN LOOK RL YM 12-BMGL-M10BYR AM",
  "MIRROR BASIC YMH",
  "MIRROR ARROW HND",
  "MIRROR ARROW YMH",
  "MIRROR BASIC HND",
  "MIRROR SET (CHR)",
  "MIRROR,BACK (SET)",
  "MIRROR,BACK (SET) OLD YMH",
  "MIRROR, BACK (SET) FED",
  "MIRROR, BACK (SET) OLD YMH FED",
  "MIRROR,BACK (SET) HND",
  "MIRROR,BACK (SET) YMH",
  "CAP LOCK NUT K3VA",
  "COVER MIRROR K3VA",
  "PROTECTOR MUFFLER K2SA (AM)",
  "COVER INNER LOWER KZL",
  "COVER FRONT LOWER K25",
  "COVER L BODY SIDE K59A AHM-PC",
  "COVER R BODY SIDE K59A AHM-PC",
  "COVER HANDLE FRONT K25",
  "GARNISH FR",
  "GAUGE HOPPER NETRAL 01",
  "SWITCH BOX COVER 16 SAE",
  "STAND BASE 12 LDA",
  "SWITCH COVER 301 CRJ",
  "RR GRAB RAIL K1AL (AM)",
  "SUB ASSY CASE AIR CLEANER KWN (K2VM)",
  "PROTECTOR MUFFLER K2SM",
  "PROTECTOR MUFFLER K2SM (AM)"
];

async function run() {
  try {
    const [allProducts] = await db.execute("SELECT id, product_code, product_name FROM products");
    const [allMolds] = await db.execute("SELECT id, code, name FROM molds");
    const [allMachines] = await db.execute("SELECT id, code, name FROM machines");
    const [allMmu] = await db.execute("SELECT * FROM machine_mold_uph");

    console.log(`Total products: ${allProducts.length}, Molds: ${allMolds.length}, MMU: ${allMmu.length}`);

    const mapped = [];

    for (let i = 0; i < searchItems.length; i++) {
      const search = searchItems[i];
      // clean search
      const clean = search.trim().toLowerCase();

      // Find matching products
      const pMatches = allProducts.filter(p => {
        const pName = (p.product_name || '').toLowerCase();
        const pCode = (p.product_code || '').toLowerCase();
        return pName.includes(clean) || clean.includes(pName) || pCode.includes(clean);
      });

      // Find matching molds
      const mMatches = allMolds.filter(m => {
        const mName = (m.name || '').toLowerCase();
        const mCode = (m.code || '').toLowerCase();
        return mName.includes(clean) || clean.includes(mName);
      });

      // Find MMU records
      let mmuList = [];
      if (pMatches.length > 0) {
        const pIds = pMatches.map(p => p.id);
        mmuList = allMmu.filter(mmu => pIds.includes(mmu.product_id));
      }
      if (mmuList.length === 0 && mMatches.length > 0) {
        const moldIds = mMatches.map(m => m.id);
        mmuList = allMmu.filter(mmu => moldIds.includes(mmu.mold_id));
      }

      // If still not found, try fuzzy match on parts of the name
      let uphVal = null;
      let cavVal = null;
      let mcName = null;
      let moldName = null;
      let prodCode = null;

      if (mmuList.length > 0) {
        const primary = mmuList.find(m => m.is_primary === 1) || mmuList[0];
        uphVal = primary.uph;
        cavVal = primary.cavity;
        const mc = allMachines.find(m => m.id === primary.machine_id);
        mcName = mc ? `${mc.code} (${mc.name})` : `MC ID ${primary.machine_id}`;
        const mo = allMolds.find(m => m.id === primary.mold_id);
        moldName = mo ? mo.name : null;
        const pr = allProducts.find(p => p.id === primary.product_id);
        prodCode = pr ? pr.product_code : (pMatches[0] ? pMatches[0].product_code : null);
      } else if (pMatches.length > 0) {
        prodCode = pMatches[0].product_code;
      }

      mapped.push({
        no: i + 1,
        item_name: search,
        product_code: prodCode,
        uph: uphVal,
        cavity: cavVal,
        machine: mcName,
        mold: moldName,
        p_matches_count: pMatches.length,
        mmu_count: mmuList.length
      });
    }

    fs.writeFileSync('scratch/uph_full_mapped.json', JSON.stringify(mapped, null, 2));
    console.log("Full mapped written to scratch/uph_full_mapped.json");
    
    // Print summary stats
    const withUph = mapped.filter(m => m.uph !== null);
    console.log(`Matched with UPH: ${withUph.length} / ${mapped.length}`);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
