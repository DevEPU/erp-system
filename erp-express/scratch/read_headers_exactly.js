const xlsx = require('xlsx');

function run() {
  const workbook = xlsx.readFile('C:/laragon/www/erp-epu-main/06. Jun MD Vendor 1.xlsx');
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log('Row 0:', data[0]);
  console.log('Row 1:', data[1]);
  console.log('Row 2:', data[2]);
}

run();
