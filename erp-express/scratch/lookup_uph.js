const db = require('../src/config/db');
const fs = require('fs');
const xlsx = require('xlsx');
const path = require('path');

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
  "MIRROR,BACK (SET OLD YMH)",
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
    const [pCols] = await db.execute("DESCRIBE products");
    console.log("Product columns:", pCols.map(c => c.Field).join(', '));
    
    const [mmuCols] = await db.execute("DESCRIBE machine_mold_uph");
    console.log("MMU columns:", mmuCols.map(c => c.Field).join(', '));

    const [moldCols] = await db.execute("DESCRIBE molds");
    console.log("Molds columns:", moldCols.map(c => c.Field).join(', '));

    // Check Excel files in workspace
    const rootDir = 'c:/laragon/www/erp-epu-main';
    const excelFiles = fs.readdirSync(rootDir).filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'));
    console.log("Excel files found:", excelFiles);

    const allData = [];

    for (const item of searchItems) {
      const clean = item.trim().replace(/\(.*?\)/g, '').trim();
      const firstWord = clean.split(' ')[0];
      const lastWord = clean.split(' ').slice(-1)[0];

      // Query DB products and machine_mold_uph
      const [rows] = await db.execute(
        `SELECT p.id, p.product_code, p.product_name,
                mmu.uph as mmu_uph, mmu.cavity as mmu_cavity,
                m.code as machine_code, mo.code as mold_code, mo.name as mold_name
         FROM products p
         LEFT JOIN machine_mold_uph mmu ON mmu.product_id = p.id
         LEFT JOIN machines m ON m.id = mmu.machine_id
         LEFT JOIN molds mo ON mo.id = mmu.mold_id
         WHERE p.product_name LIKE ? OR p.product_name LIKE ?
         LIMIT 3`,
        [`%${item}%`, `%${clean}%`]
      );

      // Also check molds table
      const [moldRows] = await db.execute(
        `SELECT mo.code, mo.name, mmu.uph, mmu.cavity, m.code as machine_code
         FROM molds mo
         LEFT JOIN machine_mold_uph mmu ON mmu.mold_id = mo.id
         LEFT JOIN machines m ON m.id = mmu.machine_id
         WHERE mo.name LIKE ? OR mo.code LIKE ?
         LIMIT 3`,
        [`%${item}%`, `%${clean}%`]
      );

      allData.push({
        item,
        db_products: rows,
        db_molds: moldRows
      });
    }

    fs.writeFileSync('scratch/search_summary.json', JSON.stringify(allData, null, 2));
    console.log("Search summary saved.");

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
