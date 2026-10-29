const XLSX = require('xlsx');

function run() {
  const wb = XLSX.readFile('C:/laragon/www/erp-epu-main/06. Jun MD Vendor 1.xlsx');
  const ws = wb.Sheets['4. MD Vendor'];
  const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const rows = rawData.slice(3).filter(r => r[3] && r[4] && r[5]);

  console.log('Sample prices for June 2026 (Col 48):');
  let zeroCount = 0;
  let nonNumeric = 0;
  
  rows.slice(0, 15).forEach((r, i) => {
    console.log(`Row ${i}: Code: ${r[3]} | Name: ${r[4]} | Price: ${r[48]} (Type: ${typeof r[48]})`);
  });

  rows.forEach(r => {
    const val = r[48];
    if (val === 0 || val === '0' || val === null || val === undefined) {
      zeroCount++;
    }
    if (typeof val !== 'number') {
      nonNumeric++;
    }
  });

  console.log(`\nTotal rows: ${rows.length}`);
  console.log(`Zero/Null prices count: ${zeroCount}`);
  console.log(`Non-numeric prices count: ${nonNumeric}`);
}

run();
