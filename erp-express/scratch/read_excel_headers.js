const xlsx = require('xlsx');

function run() {
  const workbook = xlsx.readFile('C:/laragon/www/erp-epu-main/06. Jun MD Vendor 1.xlsx');
  console.log('Sheet Names:', workbook.SheetNames);
  
  // Read first sheet
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  // Get first 10 rows
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  console.log('\nFirst 15 rows of first sheet:');
  data.slice(0, 15).forEach((row, i) => {
    console.log(`Row ${i}:`, row);
  });
}

run();
