const xlsx = require('xlsx');

const wb = xlsx.readFile('c:/laragon/www/erp-epu-main/Dataset/Production Planning Ach Rate Control Agustus 2026 Rev01.xlsx');

console.log('=== MAPPING GROUP ROWS ===');
const mg = xlsx.utils.sheet_to_json(wb.Sheets['Mapping Group'], { header: 1 });
mg.forEach((row, idx) => {
  if (row && (row[1] || row[3])) {
    console.log(`Row ${idx}: [Col B: ${row[1]}] [Col C: ${row[2]}] [Col D: ${row[3]}] [Col E: ${row[4]}]`);
  }
});

console.log('\n=== CHECKING ALL SHEETS FOR MOLD / MACHINE / PART MAPPINGS ===');
// Let's inspect Sheet 1, Sheet 2, etc. to see what data they hold
const numSheets = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '18'];
let allParts = new Map();
let allMolds = new Set();
let allMachines = new Set();

numSheets.forEach(sName => {
  if (!wb.Sheets[sName]) return;
  const rows = xlsx.utils.sheet_to_json(wb.Sheets[sName], { header: 1 });
  // Find where table starts
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
      if (!r || r[0] == null || r[0] === 'Total') continue;
      const mc = r[0];
      const tonase = r[1];
      const codePart = r[2];
      const partName = r[3];
      const uph = r[4];
      if (codePart && partName) {
        const key = `${mc}|${tonase}|${codePart}|${partName}`;
        allParts.set(key, { mc, tonase, codePart, partName, uph, sheet: sName });
        allMachines.add(`MC-${mc} (${tonase}T)`);
      }
    }
  }
});

console.log(`Found ${allParts.size} distinct MC-Tonase-Part combinations in date sheets!`);
console.log(`Machines referenced in sheets:`, Array.from(allMachines).sort());
console.log('\nSample 20 Part rows:');
let count = 0;
for (const [k, v] of allParts.entries()) {
  if (count++ < 20) console.log(v);
}
