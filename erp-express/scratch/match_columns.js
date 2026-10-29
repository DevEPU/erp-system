const xlsx = require('xlsx');

function run() {
  const workbook = xlsx.readFile('C:/laragon/www/erp-epu-main/06. Jun MD Vendor 1.xlsx');
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  
  const r1 = data[1];
  const r2 = data[2];
  
  console.log('Index | Row 1 (Group) | Row 2 (Detail) | Example Row 3 Value');
  console.log('-------------------------------------------------------------');
  for (let i = 0; i < Math.max(r1.length, r2.length); i++) {
    console.log(`${String(i).padStart(5)} | ${String(r1[i] || '').padEnd(20)} | ${String(r2[i] || '').padEnd(20)} | ${data[3][i]}`);
  }
}

run();
