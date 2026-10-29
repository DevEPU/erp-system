const fs = require('fs');
const db = require('../src/config/db');

const poData = [
  { name: "BOX LUGGAGE K2FK", po: 35600 },
  { name: "PROTECTOR MUFFLER K2SA", po: 0 },
  { name: "PROTECTOR MUFFLER K59", po: 0 },
  { name: "RR GRAB RAIL K1AL", po: 48400 },
  { name: "RR GRAB RAIL K2FP", po: 18800 },
  { name: "BOX LUGGAGE K1Z", po: 31500 },
  { name: "PLATE BOTTOM K3VA", po: 20700 },
  { name: "PLATE BOTTOM SUZUKI (45111-12K10)", po: 1500 },
  { name: "HOLDER MIRROR S/A RH", po: 0 },
  { name: "HOLDER MIRROR S/A LH", po: 0 },
  { name: "HOLDER MIRROR K3VA", po: 55000 },
  { name: "PLATE BOTTOM K1AL SC", po: 51400 },
  { name: "COVER AIR CLEANER K60", po: 49480 },
  { name: "ELEMENT COMP A/C K60R", po: 49480 },
  { name: "SET ILLUST AC ELEMENT KOJA", po: 0 },
  { name: "SET ILLUST AIR C ELEMENT K2V", po: 0 },
  { name: "ELEMENT COMP A/C KOJA", po: 69840 },
  { name: "SUB ASSY COVER AIR CLEANER K1AA", po: 40040 },
  { name: "SUB ASSY COVER AIR CLEANER KOJA", po: 0 },
  { name: "CASE AIR CLEANER KWN (K2V)", po: 0 },
  { name: "SUB ASSY CASE AIR CLEANER KOJA", po: 0 },
  { name: "SUB ASSY CASE AIR CLEANER K1AL", po: 103360 },
  { name: "COVER SUB ASSY AIR CLEANER KOJA (AHM-PC)", po: 0 },
  { name: "CASE SUB ASSY AIR CLEANER KOJA (AHM-PC)", po: 0 },
  { name: "GRIP HANDLE BRACKET BZ050", po: 7392 },
  { name: "GRIP PARKING BRAKE LEVER 0K130", po: 8800 },
  { name: "HOLDER MIRROR BACK RH K97G", po: 24200 },
  { name: "HOLDER MIRROR BACK LH K97G", po: 24200 },
  { name: "HOLDER MIRROR BACK RH KZLG", po: 0 },
  { name: "HOLDER MIRROR BACK LH KZLG", po: 0 },
  { name: "SUB ASSY HOLDER MIRROR BACK RH/LH K93", po: 15400 },
  { name: "COVER PARKING BRAKE HOLE F1010", po: 880 },
  { name: "BACK MRR STYLISH RL YM 12-BMST-M10BYR AM", po: 240 },
  { name: "BACK MRR STYLISH RL HD 12-BMST-M10BHR AM", po: 720 },
  { name: "BACK MRR GN LOOK RL HD FP-BMGL-M10BHR AM", po: 1920 },
  { name: "BACK MRR GN LOOK RL YM FP-BMGL-M10BYR AM", po: 320 },
  { name: "BACK MRR GN LOOK RL HD 12-BMGL-M10BHR AM", po: 3840 },
  { name: "BACK MRR GN LOOK RL YM 12-BMGL-M10BYR AM", po: 1040 },
  { name: "MIRROR BASIC YMH", po: 0 },
  { name: "MIRROR ARROW HND", po: 0 },
  { name: "MIRROR ARROW YMH", po: 0 },
  { name: "MIRROR BASIC HND", po: 0 },
  { name: "MIRROR SET (CHR)", po: 0 },
  { name: "MIRROR,BACK (SET)", po: 2880 },
  { name: "MIRROR,BACK (SET) OLD YMH", po: 720 },
  { name: "MIRROR, BACK (SET) FED", po: 1248 },
  { name: "MIRROR, BACK (SET) OLD YMH FED", po: 120 },
  { name: "MIRROR,BACK (SET) HND", po: 0 },
  { name: "MIRROR,BACK (SET) YMH", po: 1320 },
  { name: "CAP LOCK NUT K3VA", po: 55000 },
  { name: "COVER MIRROR K3VA", po: 55000 },
  { name: "PROTECTOR MUFFLER K2SA (AM)", po: 578 },
  { name: "COVER INNER LOWER KZL", po: 258 },
  { name: "COVER FRONT LOWER K25", po: 1050 },
  { name: "COVER L BODY SIDE K59A AHM-PC", po: 948 },
  { name: "COVER R BODY SIDE K59A AHM-PC", po: 756 },
  { name: "COVER HANDLE FRONT K25", po: 0 },
  { name: "GARNISH FR", po: 196 },
  { name: "GAUGE HOPPER NETRAL 01", po: 2000 },
  { name: "SWITCH BOX COVER 16 SAE", po: 4000 },
  { name: "STAND BASE 12 LDA", po: 0 },
  { name: "SWITCH COVER 301 CRJ", po: 0 },
  { name: "RR GRAB RAIL K1AL (AM)", po: 222 },
  { name: "SUB ASSY CASE AIR CLEANER KWN (K2VM)", po: 82460 },
  { name: "PROTECTOR MUFFLER K2SM", po: 24000 },
  { name: "PROTECTOR MUFFLER K2SM (AM)", po: 0 },
  { name: "CAP DEOXIDE BLUE", po: 142800 },
  { name: "CAP DEOXIDE PURPLE", po: 30000 }
];

async function calculateLabor() {
  const [mmu] = await db.execute(`
    SELECT mmu.*, m.code as mc_code, m.name as mc_name, mo.name as mold_name, p.product_code, p.product_name
    FROM machine_mold_uph mmu
    LEFT JOIN machines m ON m.id = mmu.machine_id
    LEFT JOIN molds mo ON mo.id = mmu.mold_id
    LEFT JOIN products p ON p.id = mmu.product_id
  `);

  const [products] = await db.execute("SELECT id, product_code, product_name FROM products");

  // Check CAP DEOXIDE in DB
  const [capDeoxide] = await db.execute("SELECT * FROM products WHERE product_name LIKE '%DEOXIDE%' OR product_code LIKE '%DEOXIDE%'");
  console.log("Cap Deoxide products in DB:", capDeoxide);

  const prevMapped = JSON.parse(fs.readFileSync('scratch/uph_enhanced_mapped.json'));

  const TOTAL_LABOR_BUDGET = 1258677366;
  const TOTAL_OPERATING_HOURS = 546;

  // Let's get UPH for all items
  const itemsWithUph = poData.map((item, idx) => {
    let match = prevMapped.find(m => m.item_name.toLowerCase() === item.name.toLowerCase());
    let uph = match ? match.uph : null;

    if (!uph) {
      if (item.name.includes("DEOXIDE")) {
        uph = 250; // standard small cap injection UPH or 200
      } else {
        uph = 100; // default
      }
    }

    const hoursNeeded = item.po > 0 ? (item.po / uph) : 0;
    return {
      no: idx + 1,
      name: item.name,
      po_qty: item.po,
      uph: uph,
      hours_needed: hoursNeeded
    };
  });

  const totalMachineHoursNeeded = itemsWithUph.reduce((sum, item) => sum + item.hours_needed, 0);
  console.log(`Total Machine Hours needed for all POs: ${totalMachineHoursNeeded.toFixed(2)} hours`);

  // Rate per machine hour = TOTAL_LABOR_BUDGET / totalMachineHoursNeeded
  const laborRatePerMachineHour = TOTAL_LABOR_BUDGET / totalMachineHoursNeeded;
  console.log(`Labor Rate per Machine Hour = Rp ${laborRatePerMachineHour.toLocaleString('id-ID', { maximumFractionDigits: 2 })} / hour`);

  // Calculate Labor Cost per unit (Pcs) for each item:
  // Labor Cost per Pcs = laborRatePerMachineHour / UPH
  // Total Labor for item = Labor Cost per Pcs * PO Qty
  const finalResults = itemsWithUph.map(item => {
    const laborPerPcs = Math.round(laborRatePerMachineHour / item.uph);
    const totalLaborItem = laborPerPcs * item.po_qty;
    return {
      ...item,
      labor_per_pcs: laborPerPcs,
      total_labor_item: totalLaborItem
    };
  });

  const checkTotalLaborSum = finalResults.reduce((sum, item) => sum + item.total_labor_item, 0);
  console.log(`Sum of total labor for all items: Rp ${checkTotalLaborSum.toLocaleString('id-ID')}`);

  fs.writeFileSync('scratch/final_po_labor_calculated.json', JSON.stringify(finalResults, null, 2));
  console.log("Calculated successfully and saved to scratch/final_po_labor_calculated.json");
}

calculateLabor();
